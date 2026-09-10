import { createHash, randomBytes } from 'node:crypto';
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APP_ENV, TOOL_ID } from './model.mjs';

const SESSION_TTL_SECONDS = 60;
const CODE_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;

function credentialKey(userId) {
  const digest = createHash('sha256').update(userId, 'utf8').digest('hex');
  return { PK: `PORTAL_COGNITO#${digest}`, SK: `PORTAL_COGNITO#${digest}` };
}

function codeKey(code) {
  const digest = createHash('sha256').update(code, 'utf8').digest('hex');
  return { PK: `PORTAL_SESSION#${digest}`, SK: `PORTAL_SESSION#${digest}` };
}

function attributeMap(attributes = []) {
  return Object.fromEntries(attributes.map(({ Name, Value }) => [Name, Value]));
}

async function ensureCognitoUser(cognito, { userPoolId, email, userId, displayName }) {
  let current;
  try {
    current = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }));
  } catch (error) {
    if (error?.name !== 'UserNotFoundException') throw error;
    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: displayName },
        { Name: 'custom:legacy_user_id', Value: userId },
      ],
    }));
    return { created: true };
  }
  const attributes = attributeMap(current.UserAttributes);
  if (!attributes['custom:legacy_user_id']) {
    throw Object.assign(new Error('Conta existente não gerenciada pelo portal; use federação ou autenticação própria.'), { statusCode: 409 });
  }
  // O identificador legado veio do Supabase, enquanto `userId` pertence ao
  // Portal. Eles são namespaces diferentes e, portanto, não devem ser
  // comparados. A presença do atributo imutável comprova que esta é uma conta
  // criada pela migração; o e-mail verificado é o vínculo entre as identidades.
  const updates = [
    { Name: 'email_verified', Value: 'true' },
    { Name: 'name', Value: displayName },
  ];
  await cognito.send(new AdminUpdateUserAttributesCommand({ UserPoolId: userPoolId, Username: email, UserAttributes: updates }));
  return { created: false };
}

async function authenticateWithManagedPassword(cognito, { userPoolId, clientId, email }) {
  const password = `A1!${randomBytes(32).toString('base64url')}`;
  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId, Username: email, Password: password, Permanent: true,
  }));
  return cognito.send(new AdminInitiateAuthCommand({
    UserPoolId: userPoolId, ClientId: clientId, AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  }));
}

export async function createPortalSession(cognito, documentClient, tableName, config, identity, now = Date.now()) {
  const { userPoolId, clientId } = config;
  if (!userPoolId || !clientId) throw Object.assign(new Error('Cognito não configurado.'), { statusCode: 503 });
  const { created } = await ensureCognitoUser(cognito, { userPoolId, ...identity });
  const storedCredential = await documentClient.send(new GetCommand({
    TableName: tableName, Key: credentialKey(identity.userId), ConsistentRead: true,
  }));
  let authenticated;
  if (storedCredential.Item?.refreshToken) {
    try {
      authenticated = await cognito.send(new AdminInitiateAuthCommand({
        UserPoolId: userPoolId, ClientId: clientId, AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: { REFRESH_TOKEN: storedCredential.Item.refreshToken },
      }));
    } catch (error) {
      // Tokens de atualização do Cognito expiram ou podem ser revogados. Como a
      // conta foi validada acima como gerenciada pelo Portal, recupere somente
      // esse caso em vez de transformar todo acesso futuro à ferramenta em 502.
      if (error?.name !== 'NotAuthorizedException') throw error;
      authenticated = await authenticateWithManagedPassword(cognito, {
        userPoolId, clientId, email: identity.email,
      });
    }
  } else {
    // Newly provisioned users (and a one-time migration of legacy portal-managed users)
    // receive a random credential. Subsequent accesses exchange the refresh token instead.
    authenticated = await authenticateWithManagedPassword(cognito, {
      userPoolId, clientId, email: identity.email,
    });
  }
  const tokens = authenticated.AuthenticationResult;
  if (!tokens?.IdToken || !tokens?.AccessToken) throw new Error('Cognito não emitiu a sessão esperada.');

  const refreshToken = tokens.RefreshToken || storedCredential.Item?.refreshToken;
  if (!refreshToken) throw new Error('Cognito não emitiu credencial renovável.');
  if (created || tokens.RefreshToken) {
    await documentClient.send(new PutCommand({
      TableName: tableName,
      Item: { ...credentialKey(identity.userId), entityType: 'portal_cognito_credential', refreshToken, updated_at: new Date(now).toISOString() },
    }));
  }
  const launchCode = randomBytes(32).toString('base64url');
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  await documentClient.send(new PutCommand({
    TableName: tableName,
    Item: {
      ...codeKey(launchCode), entityType: 'portal_session', toolId: TOOL_ID, environment: APP_ENV,
      userId: identity.userId, workspaceId: identity.workspaceId, expiresAt,
      idToken: tokens.IdToken, accessToken: tokens.AccessToken, refreshToken,
      created_at: new Date(now).toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  }));
  return { launchCode, expiresIn: SESSION_TTL_SECONDS };
}

export async function consumePortalSession(documentClient, tableName, code, now = Date.now()) {
  if (!CODE_PATTERN.test(String(code || ''))) throw Object.assign(new Error('Código de acesso inválido.'), { statusCode: 400 });
  const consumed = await documentClient.send(new DeleteCommand({ TableName: tableName, Key: codeKey(code), ReturnValues: 'ALL_OLD' }));
  const item = consumed.Attributes;
  if (!item || item.entityType !== 'portal_session' || item.toolId !== TOOL_ID || item.environment !== APP_ENV || item.expiresAt < Math.floor(now / 1000)) {
    throw Object.assign(new Error('Código de acesso inválido ou expirado.'), { statusCode: 401 });
  }
  return { access_token: item.idToken, cognito_access_token: item.accessToken, refresh_token: item.refreshToken };
}
