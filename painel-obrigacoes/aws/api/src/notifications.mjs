import { createHash } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { collectDeadlineAlerts, itemsHtml, mismatchItems, mismatchesHtml, recipientsForAlerts } from '../../../scripts/alertas-core.mjs';
import { loadDynamoWorkspaces, mismatchesForProfile } from './notification-datasource.mjs';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const ses = new SESv2Client({});
const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);
const day = (date) => date.toISOString().slice(0, 10);

async function claim(workspaceId, recipient, kind, runDate) {
  const key = { PK: `NOTIFICATION#${runDate}`, SK: `${workspaceId}#${kind}#${hash(recipient)}` };
  try {
    await dynamo.send(new PutCommand({ TableName: process.env.TABLE_NAME, Item: { ...key, entityType: 'notification_delivery', status: 'sending', expiresAt: Math.floor(Date.now() / 1000) + 3600 }, ConditionExpression: 'attribute_not_exists(PK) OR #status = :failed OR expiresAt < :now', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':failed': 'failed', ':now': Math.floor(Date.now() / 1000) } }));
    return key;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return null;
    throw error;
  }
}

async function mark(key, status) {
  await dynamo.send(new UpdateCommand({ TableName: process.env.TABLE_NAME, Key: key, UpdateExpression: 'SET #status = :status, expiresAt = :ttl', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': status, ':ttl': Math.floor(Date.now() / 1000) + 32 * 86400 } }));
}

async function sendDigest({ workspaceId, person, kind, subject, html, runDate }) {
  const key = await claim(workspaceId, person.email, kind, runDate);
  if (!key) return 'deduplicated';
  try {
    await ses.send(new SendEmailCommand({ FromEmailAddress: process.env.NOTIFICATION_FROM_EMAIL, Destination: { ToAddresses: [person.email] }, Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Html: { Data: html, Charset: 'UTF-8' } } } } }));
  } catch (error) {
    await mark(key, 'failed').catch(() => {});
    throw error;
  }
  // Do not turn a successful SES call back into "failed" if only this write
  // fails: leaving the one-hour claim prevents an immediate retry duplicate.
  await mark(key, 'sent');
  return 'sent';
}

export async function runNotifications({ now = new Date(), event = {}, client = dynamo } = {}) {
  const workspaces = await loadDynamoWorkspaces(client, process.env.TABLE_NAME, { QueryCommand });
  const deliveries = [];
  for (const { workspaceId, data } of workspaces) {
    const alerts = collectDeadlineAlerts({ ...data, daysAhead: Number(process.env.NOTIFICATION_DAYS_AHEAD || 5), now });
    const { responsible, managers } = recipientsForAlerts({ alerts, profiles: data.profiles });
    const obligationById = new Map(data.obligations.map((item) => [item.id, item]));
    const recentMismatches = mismatchItems({ completions: data.completions, obligationById, since: new Date(now.getTime() - 86400000).toISOString() });
    if (recentMismatches.length) data.profiles
      .filter((profile) => profile.active !== false && profile.email && ['admin', 'gestor'].includes(profile.role))
      .filter((profile) => mismatchesForProfile(recentMismatches, profile).length)
      .forEach((person) => { if (!managers.has(person.id)) managers.set(person.id, { person, items: [] }); });
    if (event.dryRun === true) { deliveries.push(...[...responsible.values(), ...managers.values()].map(() => Promise.resolve('planned'))); continue; }
    for (const { person, items } of responsible.values()) deliveries.push(sendDigest({ workspaceId, person, kind: 'responsible', runDate: day(now), subject: `Painel de Obrigações — ${items.length} pendência(s) para você`, html: `<p>Olá, ${person.display_name || ''}.</p><p>Você tem ${items.length} obrigação(ões) atrasada(s) ou vencendo em breve:</p><ul>${itemsHtml(items)}</ul><p style="color:#5B6B70;font-size:12px;">Lembrete automático. Acesse o painel para atualizar ou concluir as atividades.</p>` }));
    for (const { person, items } of managers.values()) {
      const mismatches = mismatchesForProfile(recentMismatches, person);
      if (!items.length && !mismatches.length) continue;
      const pending = items.length ? `<p>Resumo das atividades atrasadas ou vencendo em breve na sua equipe:</p><ul>${itemsHtml(items, { showResponsible: true })}</ul>` : '<p>Nenhuma obrigação atrasada ou vencendo em breve na equipe hoje.</p>';
      const mismatch = mismatches.length ? `<p style="margin-top:16px;">Comprovantes com possível divergência de competência nas últimas 24h:</p><ul>${mismatchesHtml(mismatches)}</ul>` : '';
      deliveries.push(sendDigest({ workspaceId, person, kind: 'manager', runDate: day(now), subject: `Gestão de Atividades — resumo da equipe (${items.length} pendência(s), ${mismatches.length} divergência(s))`, html: pending + mismatch + '<p style="color:#5B6B70;font-size:12px;">Resumo automático restrito ao seu ambiente e aos módulos sob sua gestão.</p>' }));
    }
  }
  const results = await Promise.allSettled(deliveries);
  const count = (status) => results.filter((item) => item.status === 'fulfilled' && item.value === status).length;
  const failed = results.filter((item) => item.status === 'rejected').length;
  const report = { workspaces: workspaces.length, planned: deliveries.length, sent: count('sent'), deduplicated: count('deduplicated'), failed };
  console.log(JSON.stringify({ _aws: { Timestamp: Date.now(), CloudWatchMetrics: [{ Namespace: 'E3I/Notifications', Dimensions: [['Environment']], Metrics: [{ Name: 'Sent', Unit: 'Count' }, { Name: 'Failed', Unit: 'Count' }, { Name: 'Success', Unit: 'Count' }] }] }, Environment: process.env.APP_ENV || 'unknown', Sent: report.sent, Failed: failed, Success: failed ? 0 : 1, event: 'notification_summary', ...report, requestId: event.id }));
  if (failed) throw Object.assign(new Error(`${failed} destinatário(s) falharam; consulte notification_summary`), { report });
  return report;
}

export const handler = (event = {}) => runNotifications({ event });
