import { randomUUID } from 'node:crypto';
import { AdminCreateUserCommand, AdminDeleteUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APP_ENV, SCHEMA_VERSION, TOOL_ID, membershipPk, publicRecord, tenantPk } from './model.mjs';

const ADMIN_PK = () => `TOOL#${TOOL_ID}#ENV#${APP_ENV}#ADMINISTRATION`;
const timestamp = () => new Date().toISOString();
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const ROLES = new Set(['member', 'manager', 'admin', 'super_admin']);
const STATUSES = new Set(['trial', 'full', 'suspended']);
const normalizeRole = (role) => ({ membro: 'member', gestor: 'manager', administrador: 'admin' })[role] || role || 'member';

function requireSuperAdmin(auth) {
  if (auth.role !== 'super_admin') throw fail('Somente super_admin pode realizar esta operação.', 403);
}

function workspaceRecord(input, current = {}) {
  const accessStatus = input.access_status ?? current.access_status ?? 'trial';
  if (!STATUSES.has(accessStatus)) throw fail('Status de acesso inválido.', 400);
  const trialEndsAt = accessStatus === 'trial' ? (input.trial_ends_at === undefined ? current.trial_ends_at : input.trial_ends_at) : null;
  if (accessStatus === 'trial') {
    const parsed = new Date(`${trialEndsAt}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trialEndsAt || '') || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== trialEndsAt) throw fail('Informe o término do trial.', 400);
  }
  return { access_status: accessStatus, trial_ends_at: trialEndsAt };
}

export class AdminService {
  constructor(client, cognito, tableName, userPoolId) {
    this.client = client; this.cognito = cognito; this.tableName = tableName; this.userPoolId = userPoolId;
  }

  async listWorkspaces(auth, { limit = 100, cursor } = {}) {
    requireSuperAdmin(auth);
    let exclusiveStartKey;
    try { exclusiveStartKey = cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString()) : undefined; }
    catch { throw fail('Cursor inválido.', 400); }
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': ADMIN_PK(), ':sk': 'WORKSPACE#' },
      Limit: Math.min(Math.max(Number(limit) || 100, 1), 100),
      ExclusiveStartKey: exclusiveStartKey,
    }));
    return { items: (result.Items || []).map(publicRecord), cursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url') : null };
  }

  async createWorkspace(auth, input) {
    requireSuperAdmin(auth);
    const id = input.id || randomUUID();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || !String(input.name || '').trim()) throw fail('Nome ou identificador da empresa inválido.', 400);
    if (input.document && String(input.document).replace(/\D/g, '').length !== 14) throw fail('CNPJ deve conter 14 dígitos.', 400);
    const now = timestamp();
    const record = { id, name: String(input.name).trim(), document: input.document || null, ...workspaceRecord(input), version: 1, workspace_id: id, entityType: 'workspaces', toolId: TOOL_ID, environment: APP_ENV, schemaVersion: SCHEMA_VERSION, created_at: now, updated_at: now };
    await this.writeWorkspace(record, true);
    return publicRecord(record);
  }

  async updateWorkspace(auth, id, patch) {
    requireSuperAdmin(auth);
    const key = { PK: ADMIN_PK(), SK: `WORKSPACE#${id}` };
    const current = (await this.client.send(new GetCommand({ TableName: this.tableName, Key: key, ConsistentRead: true }))).Item;
    if (!current) throw fail('Empresa não encontrada.', 404);
    const supplied = Number(patch.version);
    if (!Number.isInteger(supplied) || supplied !== current.version) throw fail('A empresa foi alterada por outro usuário. Atualize e tente novamente.', 409);
    const record = { ...current, ...workspaceRecord(patch, current), version: supplied + 1, updated_at: timestamp() };
    await this.writeWorkspace(record, false, supplied);
    return publicRecord(record);
  }

  async writeWorkspace(record, creating, expectedVersion) {
    const condition = creating ? 'attribute_not_exists(PK) AND attribute_not_exists(SK)' : '#version = :version';
    const base = { ConditionExpression: condition, ...(creating ? {} : { ExpressionAttributeNames: { '#version': 'version' }, ExpressionAttributeValues: { ':version': expectedVersion } }) };
    const admin = { ...record, PK: ADMIN_PK(), SK: `WORKSPACE#${record.id}`, scope: 'administration' };
    const tenant = { ...record, PK: tenantPk(record.id), SK: `WORKSPACE_META#${record.id}` };
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [{ Put: { TableName: this.tableName, Item: admin, ...base } }, { Put: { TableName: this.tableName, Item: tenant, ...base } }] }));
    } catch (error) {
      if (error.name === 'TransactionCanceledException') throw fail(creating ? 'Empresa já existente.' : 'A empresa foi alterada por outro usuário.', 409);
      throw error;
    }
  }

  async inviteUser(auth, input) {
    const workspaceId = String(input.workspaceId || auth.workspaceId);
    const role = normalizeRole(input.role);
    this.requireMembershipAdministration(auth, workspaceId, role);
    const email = String(input.email || '').trim().toLowerCase();
    const displayName = String(input.displayName || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !displayName) throw fail('Informe nome e e-mail válidos.', 400);
    // Nunca aceite um legacy id do cliente: esse atributo define a identidade
    // efetiva usada pela autorização. Contas existentes não são modificadas.
    let userId = randomUUID();
    if (!/^[a-zA-Z0-9_.:@+-]{1,200}$/.test(userId)) throw fail('Identificador legado inválido.', 400);
    const reservation = { PK: ADMIN_PK(), SK: `USER_EMAIL#${email}`, userId, entityType: 'user_invitation', created_at: timestamp() };
    try {
      await this.client.send(new PutCommand({ TableName: this.tableName, Item: reservation, ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' }));
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') throw fail('Já existe uma conta com esse e-mail.', 409);
      throw error;
    }
    let cognitoCreated = false;
    try {
      try {
        await this.cognito.send(new AdminCreateUserCommand({ UserPoolId: this.userPoolId, Username: email, DesiredDeliveryMediums: ['EMAIL'], UserAttributes: [
          { Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: displayName }, { Name: 'custom:legacy_user_id', Value: userId },
        ] }));
        cognitoCreated = true;
      } catch (error) {
        if (error.name !== 'UsernameExistsException' || input.linkExisting !== true) throw error;
        const existing = await this.cognito.send(new AdminGetUserCommand({ UserPoolId: this.userPoolId, Username: email }));
        const attributes = new Map((existing.UserAttributes || []).map(attribute => [attribute.Name, attribute.Value]));
        if (String(attributes.get('email') || '').toLowerCase() !== email) throw fail('A identidade existente não corresponde ao e-mail informado.', 409);
        userId = attributes.get('custom:legacy_user_id') || existing.Username;
        if (!/^[a-zA-Z0-9_.:@+-]{1,200}$/.test(userId || '')) throw fail('A identidade existente não possui identificador válido.', 409);
      }
      const now = timestamp();
      const profile = { PK: tenantPk(workspaceId), SK: `PROFILE#${userId}`, id: userId, email, display_name: displayName, role, workspace_id: workspaceId, active: true, version: 1, entityType: 'profiles', created_at: now, updated_at: now, schemaVersion: SCHEMA_VERSION };
      const membership = { PK: membershipPk(userId), SK: `MEMBERSHIP#${workspaceId}`, userId, workspaceId, email, role, active: true, entityType: 'membership', schemaVersion: SCHEMA_VERSION };
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Put: { TableName: this.tableName, Item: profile, ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' } },
        { Put: { TableName: this.tableName, Item: membership, ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' } },
        { Delete: { TableName: this.tableName, Key: { PK: reservation.PK, SK: reservation.SK }, ConditionExpression: 'userId = :userId', ExpressionAttributeValues: { ':userId': userId } } },
      ] }));
      return { user: { id: userId, email }, profile: publicRecord(profile), invitation: 'email' };
    } catch (error) {
      let compensated = !cognitoCreated;
      if (cognitoCreated) {
        try { await this.cognito.send(new AdminDeleteUserCommand({ UserPoolId: this.userPoolId, Username: email })); compensated = true; }
        catch { /* mantenha a reserva como marcador reconciliável; nunca registre segredos */ }
      }
      if (compensated) await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: { PK: reservation.PK, SK: reservation.SK } })).catch(() => {});
      if (error.name === 'UsernameExistsException') throw fail('Já existe uma conta com esse e-mail.', 409);
      throw error;
    }
  }

  requireMembershipAdministration(auth, workspaceId, role) {
    if (!ROLES.has(role || 'member')) throw fail('Papel inválido.', 400);
    if (auth.userId === undefined) throw fail('Autenticação obrigatória.', 401);
    if (auth.role === 'super_admin') return;
    if (auth.role !== 'admin' || auth.workspaceId !== workspaceId || role === 'super_admin') throw fail('Você não pode administrar este vínculo.', 403);
  }

  async setMembership(auth, userId, workspaceId, input) {
    if (!/^[a-zA-Z0-9_.:@+-]{1,200}$/.test(userId)) throw fail('Identificador de usuário inválido.', 400);
    const role = normalizeRole(input.role);
    this.requireMembershipAdministration(auth, workspaceId, role);
    if (auth.userId === userId) throw fail('Não é permitido alterar o próprio vínculo ou papel.', 403);
    const current = (await this.client.send(new GetCommand({ TableName: this.tableName, Key: { PK: membershipPk(userId), SK: `MEMBERSHIP#${workspaceId}` }, ConsistentRead: true }))).Item;
    if (!current && (!input.email || !input.displayName)) throw fail('Para conceder um novo vínculo, informe nome e e-mail.', 400);
    const membership = { ...(current || { PK: membershipPk(userId), SK: `MEMBERSHIP#${workspaceId}`, userId, workspaceId, email: String(input.email).toLowerCase(), entityType: 'membership', schemaVersion: SCHEMA_VERSION }), role: input.role === undefined ? (current?.role || 'member') : role, active: input.active ?? current?.active ?? true, updated_at: timestamp() };
    const profileKey = { PK: tenantPk(workspaceId), SK: `PROFILE#${userId}` };
    const profile = (await this.client.send(new GetCommand({ TableName: this.tableName, Key: profileKey, ConsistentRead: true }))).Item;
    const nextProfile = profile || { ...profileKey, id: userId, email: membership.email, display_name: String(input.displayName), workspace_id: workspaceId, entityType: 'profiles', schemaVersion: SCHEMA_VERSION, version: 1, created_at: timestamp() };
    await this.client.send(new TransactWriteCommand({ TransactItems: [
      { Put: { TableName: this.tableName, Item: membership,
        ConditionExpression: current ? '#role = :previousRole AND active = :previousActive' : 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
        ...(current ? { ExpressionAttributeNames: { '#role': 'role' }, ExpressionAttributeValues: { ':previousRole': current.role, ':previousActive': current.active } } : {}) } },
      { Put: { TableName: this.tableName, Item: { ...nextProfile, ...(input.displayName ? { display_name: String(input.displayName).trim() } : {}), role: membership.role, active: membership.active, updated_at: membership.updated_at },
        ConditionExpression: profile ? '#role = :previousRole AND active = :previousActive' : 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
        ...(profile ? { ExpressionAttributeNames: { '#role': 'role' }, ExpressionAttributeValues: { ':previousRole': profile.role, ':previousActive': profile.active } } : {}) } },
    ] }));
    return publicRecord(membership);
  }

  async removeMembership(auth, userId, workspaceId) {
    if (!/^[a-zA-Z0-9_.:@+-]{1,200}$/.test(userId)) throw fail('Identificador de usuário inválido.', 400);
    this.requireMembershipAdministration(auth, workspaceId, 'member');
    if (auth.userId === userId) throw fail('Não é permitido remover o próprio vínculo.', 403);
    await this.client.send(new TransactWriteCommand({ TransactItems: [
      { Delete: { TableName: this.tableName, Key: { PK: membershipPk(userId), SK: `MEMBERSHIP#${workspaceId}` } } },
      { Delete: { TableName: this.tableName, Key: { PK: tenantPk(workspaceId), SK: `PROFILE#${userId}` } } },
    ] }));
  }
}
