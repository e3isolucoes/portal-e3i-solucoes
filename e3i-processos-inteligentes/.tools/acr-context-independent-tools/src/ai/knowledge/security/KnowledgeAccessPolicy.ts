import { KnowledgeChunk } from '../schemas/KnowledgeChunk';
import { KnowledgeSource } from '../schemas/KnowledgeSource';

export class KnowledgeAccessPolicy {
  public isChunkEligible(chunk: KnowledgeChunk, requestingOrganizationId: string, includeHistorical: boolean = false): boolean {
    // Tenant safety check
    if (chunk.organizationId !== requestingOrganizationId) {
      return false;
    }

    // Historical check
    if (!includeHistorical && chunk.supersededAt) {
      return false;
    }

    // Restricted sensitivity protection: RESTRICTED chunks are blocked from automatic AI retrieval operations
    if (chunk.sensitivity === 'RESTRICTED') {
      return false;
    }

    return true;
  }

  public isSourceEligible(source: KnowledgeSource, requestingOrganizationId: string): boolean {
    if (source.organizationId !== requestingOrganizationId) {
      return false;
    }

    if (source.status === 'SUPERSEDED' || source.status === 'DELETED') {
      return false;
    }

    if (source.sensitivity === 'RESTRICTED') {
      return false;
    }

    return true;
  }
}
