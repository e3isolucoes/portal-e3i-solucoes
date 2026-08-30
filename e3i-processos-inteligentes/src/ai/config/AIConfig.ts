import { AIConfigurationError } from '../errors/AIConfigurationError';

export interface AIConfigType {
  enabled: boolean;
  provider: string;
  models: {
    fast: string;
    balanced: string;
  };
  embedding: {
    enabled: boolean;
    provider: string;
    model: string;
    dimensions: number;
    distanceMeasure: string;
    maxBatchSize: number;
  };
  retrieval: {
    maxResults: number;
  };
  lexical: {
    maxQueryTerms: number;
    indexVersion: number;
  };
  hybrid: {
    vectorTopK: number;
    lexicalTopK: number;
    finalTopK: number;
    rrfK: number;
  };
  defaultMaxOutputTokens: number;
  requestTimeoutMs: number;
}

export function loadAIConfig(): AIConfigType {
  const enabled = process.env.AI_FEATURES_ENABLED !== 'false' && (process.env.AI_FEATURES_ENABLED === 'true' || process.env.AI_FEATURES_ENABLED === '1' || process.env.NODE_ENV !== 'production');
  const provider = process.env.AI_PROVIDER || 'gemini';
  const fast = process.env.GEMINI_MODEL_FAST || '';
  const balanced = process.env.GEMINI_MODEL_BALANCED || '';

  const config: AIConfigType = {
    enabled,
    provider,
    models: {
      fast,
      balanced,
    },
    embedding: {
      enabled: process.env.EMBEDDING_FEATURE_ENABLED !== 'false',
      provider: process.env.EMBEDDING_PROVIDER || 'vertex-ai',
      model: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10),
      distanceMeasure: process.env.EMBEDDING_DISTANCE_MEASURE || 'COSINE',
      maxBatchSize: parseInt(process.env.EMBEDDING_MAX_BATCH_SIZE || '32', 10),
    },
    retrieval: {
      maxResults: parseInt(process.env.RAG_RETRIEVAL_MAX_RESULTS || '10', 10),
    },
    lexical: {
      maxQueryTerms: parseInt(process.env.RAG_LEXICAL_MAX_QUERY_TERMS || '20', 10),
      indexVersion: parseInt(process.env.RAG_LEXICAL_INDEX_VERSION || '1', 10),
    },
    hybrid: {
      vectorTopK: parseInt(process.env.RAG_VECTOR_TOP_K || '10', 10),
      lexicalTopK: parseInt(process.env.RAG_LEXICAL_TOP_K || '10', 10),
      finalTopK: parseInt(process.env.RAG_FINAL_TOP_K || '10', 10),
      rrfK: parseInt(process.env.RAG_RRF_K || '60', 10),
    },
    defaultMaxOutputTokens: parseInt(process.env.AI_DEFAULT_MAX_OUTPUT_TOKENS || '2048', 10),
    requestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '30000', 10),
  };

  if (config.embedding.dimensions <= 0 || config.embedding.dimensions > 2048) {
    throw new Error('EMBEDDING_CONFIGURATION_ERROR: Invalid embedding dimensions. Must be between 1 and 2048.');
  }

  if (process.env.NODE_ENV === 'production' && config.provider === 'mock') {
    console.error("INITIALIZATION FAILED: AI_PROVIDER cannot be 'mock' in production environment.");
    process.exit(1);
  }

  return config;
}

export function validateAIConfig(config: AIConfigType = AIConfig): void {
  if (config.enabled && config.provider === 'gemini') {
    if (!config.models.fast) {
      throw new AIConfigurationError('AI_CONFIGURATION_ERROR: GEMINI_MODEL_FAST is required when AI is enabled with gemini provider');
    }
    if (!config.models.balanced) {
      throw new AIConfigurationError('AI_CONFIGURATION_ERROR: GEMINI_MODEL_BALANCED is required when AI is enabled with gemini provider');
    }
  }
}

export const AIConfig: AIConfigType = loadAIConfig();
