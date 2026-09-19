function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

export class IntelligenceConfigurationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'IntelligenceConfigurationError';
    this.code = code;
  }
}

export function readIntelligenceConfig(env = process.env) {
  const environment = String(env.E3I_ENVIRONMENT || env.NODE_ENV || 'production').trim().toLowerCase();
  const enabled = truthy(env.E3I_INTELLIGENCE_ENABLED);
  const shadowMode = env.E3I_INTELLIGENCE_SHADOW_MODE === undefined
    ? true
    : truthy(env.E3I_INTELLIGENCE_SHADOW_MODE);

  if (enabled && environment !== 'staging' && environment !== 'test') {
    throw new IntelligenceConfigurationError(
      'STAGING_ONLY',
      'E3I Intelligence may only be enabled in isolated staging during the shadow rollout',
    );
  }

  if (enabled && !shadowMode) {
    throw new IntelligenceConfigurationError(
      'SHADOW_MODE_REQUIRED',
      'E3I Intelligence must remain in shadow/read-only mode during the initial rollout',
    );
  }

  return Object.freeze({
    environment,
    enabled,
    shadowMode,
    processingPurposeId: String(
      env.E3I_INTELLIGENCE_PROCESSING_PURPOSE_ID || 'operational-shadow-mapping-v1',
    ).trim(),
    retentionClass: String(
      env.E3I_INTELLIGENCE_RETENTION_CLASS || 'ANALYTICS_2Y',
    ).trim(),
  });
}
