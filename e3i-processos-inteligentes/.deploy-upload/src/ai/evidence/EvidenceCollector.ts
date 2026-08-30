import { Evidence, EvidenceSourceType } from './Evidence';

export class EvidenceCollector {
  private evidenceList: Evidence[] = [];

  add(organizationId: string, sourceType: EvidenceSourceType, sourceId: string, excerpt?: string): Evidence {
    const evidence: Evidence = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      sourceType,
      sourceId,
      excerpt: excerpt ? excerpt.substring(0, 200) : undefined,
      createdAt: new Date().toISOString(),
    };
    this.evidenceList.push(evidence);
    return evidence;
  }

  getAll(): Evidence[] {
    return [...this.evidenceList];
  }

  getReferences(): { id: string; sourceType: string; sourceId: string }[] {
    return this.evidenceList.map(e => ({
      id: e.id,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
    }));
  }
}
