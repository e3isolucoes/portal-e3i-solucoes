import { KnowledgeSource } from '../schemas/KnowledgeSource';
import { KnowledgeDocument } from '../schemas/KnowledgeDocument';
import { InferenceType } from '../../evidence/Evidence';

export class KnowledgeNormalizer {
  public normalize(source: KnowledgeSource, rawContent: string, inferenceType: InferenceType = 'FACT', customMetadata?: Record<string, any>): KnowledgeDocument {
    // Secret sanitization check at boundary
    const secretPatterns = [
      /password/i,
      /secret/i,
      /api_key/i,
      /bearer\s+[a-zA-Z0-9_\-\.]+/i,
      /authorization:/i,
      /token/i,
      /private_key/i,
      /client_secret/i
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(rawContent)) {
        throw new Error('KNOWLEDGE_SENSITIVE_DATA_BLOCKED: Content contains forbidden sensitive data or secrets.');
      }
    }

    const cleanedContent = rawContent.replace(/\r\n/g, '\n').trim();

    // Basic PII heuristic check (e.g., email or cpf/phone pattern if needed)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const containsPII = emailPattern.test(cleanedContent);

    return {
      id: `doc-${source.id}-v${source.version}`,
      organizationId: source.organizationId,
      sourceId: source.id,
      sourceVersion: source.version,
      title: source.title,
      content: cleanedContent,
      inferenceType,
      metadata: {
        sourceType: source.sourceType,
        sourceReference: source.sourceReference,
        ...(customMetadata || {}),
      },
      trustLevel: source.trustLevel,
      sensitivity: source.sensitivity,
      containsPII,
      createdAt: new Date().toISOString(),
    };
  }
}
