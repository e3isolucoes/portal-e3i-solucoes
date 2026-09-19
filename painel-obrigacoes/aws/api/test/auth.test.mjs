import assert from 'node:assert/strict';
import test from 'node:test';
import { authConfigurations, normalizeSupabaseIssuer, requireModuleGrant } from '../src/auth.mjs';
import { canonicalRole } from '../src/contract.mjs';

test('normaliza o emissor Supabase sem duplicar /auth/v1', () => {
  assert.equal(normalizeSupabaseIssuer('https://project.supabase.co/auth/v1'), 'https://project.supabase.co/auth/v1');
  assert.equal(normalizeSupabaseIssuer('https://project.supabase.co/'), 'https://project.supabase.co/auth/v1');
});

test('rejeita emissor Supabase ausente', () => {
  assert.throws(() => normalizeSupabaseIssuer(''), /SUPABASE_ISSUER/);
});

test('aceita somente os emissores Cognito e Supabase explicitamente configurados', () => {
  assert.deepEqual(authConfigurations({
    AUTH_ISSUER: 'https://cognito.example/pool/', AUTH_AUDIENCE: 'client-id', SUPABASE_ISSUER: 'https://project.supabase.co',
  }), [
    { issuer: 'https://cognito.example/pool', audience: 'client-id' },
    { issuer: 'https://project.supabase.co/auth/v1', audience: 'authenticated' },
  ]);
});

test('normaliza gestor independentemente de caixa e idioma canônico', () => {
  assert.equal(canonicalRole('gestor'), 'manager');
  assert.equal(canonicalRole('Gestor'), 'manager');
  assert.equal(canonicalRole('GESTOR'), 'manager');
  assert.equal(canonicalRole('manager'), 'manager');
});

test('obrigações são capacidade básica e Administração exige grant explícito fora do papel admin', () => {
  assert.doesNotThrow(() => requireModuleGrant({ role: 'member', moduleGrants: null }, 'obrigacoes'));
  assert.doesNotThrow(() => requireModuleGrant({ role: 'manager', moduleGrants: [] }, 'obrigacoes'));
  assert.throws(() => requireModuleGrant({ role: 'manager', moduleGrants: null }, 'administracao'), /não concedido/i);
  assert.throws(() => requireModuleGrant({ role: 'manager', moduleGrants: [] }, 'administracao'), /não concedido/i);
  assert.doesNotThrow(() => requireModuleGrant({ role: 'manager', moduleGrants: ['administracao'] }, 'administracao'));
  assert.doesNotThrow(() => requireModuleGrant({ role: 'admin', moduleGrants: [] }, 'administracao'));
  assert.doesNotThrow(() => requireModuleGrant({ role: 'super_admin', moduleGrants: null }, 'administracao'));
  assert.throws(() => requireModuleGrant({ role: 'member', moduleGrants: [] }, 'relatorios'), /não concedido/i);
});
