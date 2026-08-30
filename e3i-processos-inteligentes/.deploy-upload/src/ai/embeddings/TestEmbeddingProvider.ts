import { EmbeddingProvider } from './EmbeddingProvider';
import { EmbeddingResult } from './EmbeddingTypes';

export class TestEmbeddingProvider implements EmbeddingProvider {
  private dimensions: number;
  private model: string;

  constructor(dimensions: number = 768, model: string = 'gemini-embedding-001') {
    this.dimensions = dimensions;
    this.model = model;
  }

  private generateDeterministicVector(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const index = (i * 31 + code) % this.dimensions;
      vector[index] = (vector[index] + (code / 255)) % 1.0;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      vector[0] = 1.0;
      return vector;
    }
    return vector.map(v => v / magnitude);
  }

  async embedDocument(content: string): Promise<EmbeddingResult> {
    const lower = content.toLowerCase();
    if (lower.includes('password') || lower.includes('api_key') || lower.includes('token') || lower.includes('secret')) {
      throw new Error('KNOWLEDGE_SENSITIVE_DATA_BLOCKED: Sensitive data detected.');
    }
    const vector = this.generateDeterministicVector(content);
    return {
      vector,
      model: this.model,
      dimensions: this.dimensions,
      tokenCount: Math.ceil(content.length / 4),
      provider: 'test-provider',
      generatedAt: new Date().toISOString(),
    };
  }

  async embedQuery(query: string): Promise<EmbeddingResult> {
    const vector = this.generateDeterministicVector(query);
    return {
      vector,
      model: this.model,
      dimensions: this.dimensions,
      tokenCount: Math.ceil(query.length / 4),
      provider: 'test-provider',
      generatedAt: new Date().toISOString(),
    };
  }
}
