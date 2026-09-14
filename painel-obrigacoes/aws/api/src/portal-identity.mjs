import { AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { entitySk, membershipPk, tenantPk } from './model.mjs';

const IDENTIFIER = /^[a-zA-Z0-9_-]{1,80}$/;

function attributes(user) {
  return new Map((user?.UserAttributes || []).map((attribute) => [attribute.Name, attribute.Value]));
}

function normalizedDocument(value) {
  return String(value || '').replace(/\D/g, '');
}

export async function resolvePortalIdentity(cognito, client, tableName, userPoolId, input) {
  const email = String(input?.email || '').trim().toLowerCase();
  const requestedDocument = normalizedDocument(input?.document);
  if (!userPoolId || !email) return input;

  let cognitoUser;
  try {
    cognitoUser = await cognito.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    }));
  } catch (error) {
    if (error?.name === 'UserNotFoundException') return { ...input, email };
    throw error;
  }

  const legacyUserId = String(attributes(cognitoUser).get('custom:legacy_user_id') || '');
  if (!IDENTIFIER.test(legacyUserId)) return { ...input, email };

  const result = await client.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': membershipPk(legacyUserId), ':sk': 'MEMBERSHIP#' },
    ConsistentRead: true,
  }));
  const activeMemberships = (result.Items || []).filter((membership) =>
    membership.active !== false && IDENTIFIER.test(String(membership.workspaceId || ''))
  );

  if (!activeMemberships.length) return { ...input, email, userId: legacyUserId };

  if (!requestedDocument) {
    return activeMemberships.length === 1
      ? { ...input, email, userId: legacyUserId, workspaceId: activeMemberships[0].workspaceId }
      : { ...input, email, userId: legacyUserId };
  }

  const matches = [];
  for (const membership of activeMemberships) {
    const workspaceId = String(membership.workspaceId);
    const workspace = await client.send(new GetCommand({
      TableName: tableName,
      Key: { PK: tenantPk(workspaceId), SK: entitySk('workspaces', workspaceId) },
      ConsistentRead: true,
    }));
    if (normalizedDocument(workspace.Item?.document) === requestedDocument) matches.push(membership);
  }

  if (matches.length > 1) {
    throw Object.assign(new Error('Mais de um vínculo existente corresponde ao documento informado.'), { statusCode: 409 });
  }
  if (matches.length === 1) {
    return { ...input, email, userId: legacyUserId, workspaceId: matches[0].workspaceId };
  }
  return { ...input, email, userId: legacyUserId };
}
