import test from 'node:test';
import assert from 'node:assert/strict';

import { expectedReadOnlySourcePolicy } from '../src/dynamodb-shadow-adapter.mjs';

test('source IAM policy is read-only and cannot write module tables', () => {
  const policy = expectedReadOnlySourcePolicy({
    tableNames: ['obrigacoes-table', 'suprimentos-table'],
    region: 'sa-east-1',
    accountId: '181215701228',
  });

  assert.deepEqual(policy.Action, ['dynamodb:DescribeTable', 'dynamodb:Scan']);
  assert.equal(policy.Action.some((action) => /Put|Update|Delete|Write/i.test(action)), false);
  assert.deepEqual(policy.Resource, [
    'arn:aws:dynamodb:sa-east-1:181215701228:table/obrigacoes-table',
    'arn:aws:dynamodb:sa-east-1:181215701228:table/suprimentos-table',
  ]);
});
