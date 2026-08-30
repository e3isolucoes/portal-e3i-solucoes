import { GoogleGenAI } from '@google/genai';
import { EmbeddingProvider } from './EmbeddingProvider';
import { EmbeddingResult } from './EmbeddingTypes';
import { AIConfig } from '../config/AIConfig';

export class VertexEmbeddingProvider implements EmbeddingProvider {
  private ai: GoogleGenAI;
  private model: string;
  private dimensions: number;

  constructor(model?: string, dimensions?: number) {
    this.model = model || AIConfig.embedding.model;
    this.dimensions = dimensions || AIConfig.embedding.dimensions;
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  private sanitizeContent(content: string): string {
    const lower = content.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('apikey') ||
      lower.includes('api_key') ||
      lower.includes('token') ||
      lower.includes('secret') ||
      lower.includes('authorization') ||
      lower.includes('privatekey') ||
      lower.includes('clientsecret')
    ) {
      throw new Error('KNOWLEDGE_SENSITIVE_DATA_BLOCKED: Sensitive data detected in embedding text.');
    }
    return content;
  }

  private validateVector(vector: any): number[] {
    if (!Array.isArray(vector) || vector.length !== this.dimensions) {
      throw new Error(`EMBEDDING_OUTPUT_VALIDATION_ERROR: Vector length ${vector?.length} does not match dimensions ${this.dimensions}`);
    }
    for (const val of vector) {
      if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
        throw new Error('EMBEDDING_OUTPUT_VALIDATION_ERROR: Vector contains non-numeric, NaN, or infinite values.');
      }
    }
    return vector;
  }

  async embedDocument(content: string): Promise<EmbeddingResult> {
    const cleanContent = this.sanitizeContent(content);
    try {
      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: cleanContent,
        config: {
          taskType: 'RETRIEVAL_DOCUMENT' as any,
          outputDimensionality: this.dimensions,
        },
      });

      const embeddingValues = (response as any).embeddings?.[0]?.values || (response as any).embedding?.values;
      const vector = this.validateVector(embeddingValues);

      return {
        vector,
        model: this.model,
        dimensions: this.dimensions,
        tokenCount: (response as any).usageMetadata?.totalTokenCount || null,
        provider: 'vertex-ai',
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.message && error.message.startsWith('KNOWLEDGE_SENSITIVE_DATA_BLOCKED')) {
        throw error;
      }
      throw new Error(`EMBEDDING_PROVIDER_FAILED: ${error.message || 'Unknown error'}`);
    }
  }

  async embedQuery(query: string): Promise<EmbeddingResult> {
    const cleanQuery = this.sanitizeContent(query);
    try {
      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: cleanQuery,
        config: {
          taskType: 'RETRIEVAL_QUERY' as any,
          outputDimensionality: this.dimensions,
        },
      });

      const embeddingValues = (response as any).embeddings?.[0]?.values || (response as any).embedding?.values;
      const vector = this.validateVector(embeddingValues);

      return {
        vector,
        model: this.model,
        dimensions: this.dimensions,
        tokenCount: (response as any).usageMetadata?.totalTokenCount || null,
        provider: 'vertex-ai',
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.message && error.message.startsWith('KNOWLEDGE_SENSITIVE_DATA_BLOCKED')) {
        throw error;
      }
      throw new Error(`EMBEDDING_PROVIDER_FAILED: ${error.message || 'Unknown error'}`);
    }
  }
}
