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

test('obrigações são capacidade operacional básica e demais módulos continuam protegidos', () => {
  assert.doesNotThrow(() => requireModuleGrant({ moduleGrants: null }, 'obrigacoes'));
  assert.doesNotThrow(() => requireModuleGrant({ moduleGrants: [] }, 'obrigacoes'));
  assert.doesNotThrow(() => requireModuleGrant({ moduleGrants: ['relatorios'] }, 'obrigacoes'));
  assert.doesNotThrow(() => requireModuleGrant({ moduleGrants: ['obrigacoes'] }, 'obrigacoes'));
  assert.throws(() => requireModuleGrant({ moduleGrants: ['obrigacoes'] }, 'administracao'), /não concedido/i);
  assert.throws(() => requireModuleGrant({ moduleGrants: [] }, 'relatorios'), /não concedido/i);
});
