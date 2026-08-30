import { PromptDefinition } from './PromptDefinition';

export class PromptRegistry {
  private prompts: Map<string, PromptDefinition[]> = new Map();

  register(prompt: PromptDefinition): void {
    const list = this.prompts.get(prompt.id) || [];
    const existingIndex = list.findIndex(p => p.version === prompt.version);
    if (existingIndex >= 0) {
      list[existingIndex] = prompt;
    } else {
      list.push(prompt);
    }
    list.sort((a, b) => b.version - a.version);
    this.prompts.set(prompt.id, list);
  }

  getActive(id: string, allowDraft: boolean = false): PromptDefinition {
    const list = this.prompts.get(id);
    if (!list || list.length === 0) {
      throw new Error('AI_PROMPT_NOT_FOUND');
    }
    const active = list.find(p => p.status === 'ACTIVE' || (allowDraft && p.status === 'DRAFT'));
    if (!active) {
      const latest = list[0];
      if (latest.status === 'DEPRECATED' || (!allowDraft && latest.status === 'DRAFT')) {
        throw new Error('AI_PROMPT_NOT_ACTIVE');
      }
      throw new Error('AI_PROMPT_NOT_FOUND');
    }
    if (active.status === 'DRAFT' && !allowDraft) {
      throw new Error('AI_PROMPT_NOT_ACTIVE');
    }
    return active;
  }

  getVersion(id: string, version: number, allowDraft: boolean = false): PromptDefinition {
    const list = this.prompts.get(id);
    if (!list) {
      throw new Error('AI_PROMPT_NOT_FOUND');
    }
    const found = list.find(p => p.version === version);
    if (!found) {
      throw new Error('AI_PROMPT_NOT_FOUND');
    }
    if (found.status === 'DEPRECATED' || (found.status === 'DRAFT' && !allowDraft)) {
      throw new Error('AI_PROMPT_NOT_ACTIVE');
    }
    return found;
  }

  validate(id: string, version?: number): boolean {
    try {
      if (version !== undefined) {
        this.getVersion(id, version);
      } else {
        this.getActive(id);
      }
      return true;
    } catch {
      return false;
    }
  }
}
