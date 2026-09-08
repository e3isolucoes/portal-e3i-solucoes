(() => {
  // Diagnóstico de CSP: mantém a política segura e registra a origem exata
  // de qualquer violação futura sem habilitar eval() JavaScript.
  window.addEventListener('securitypolicyviolation', (event) => {
    console.error('[E3I CSP]', {
      directive: event.effectiveDirective || event.violatedDirective,
      blockedURI: event.blockedURI,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      sample: event.sample,
    });
  });

  const legacyRequested = new URLSearchParams(window.location.search).get('backend') === 'supabase';

  globalThis.E3I_CONFIG = Object.freeze({
    dataBackend: legacyRequested ? 'supabase' : 'aws',
    awsApiBase: 'https://oezgdex1li.execute-api.sa-east-1.amazonaws.com',
    authBackend: legacyRequested ? 'supabase' : 'cognito',
    cognitoRegion: 'sa-east-1',
    cognitoUserPoolId: 'sa-east-1_cc1svByQA',
    cognitoClientId: '28ggf95n4b9q5d5ve5vvlj048p',
    portalOrigin: 'https://portal.e3isolucoes.com.br',
    enabledModules: ['obrigacoes', 'validacoes', 'dashboard', 'relatorios', 'administracao'],
    environment: legacyRequested ? 'production' : 'staging',
  });
})();
