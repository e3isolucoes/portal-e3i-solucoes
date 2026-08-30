import { ToolDefinition } from './ToolDefinition';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition[]> = new Map();

  register(tool: ToolDefinition): void {
    if (!tool.id || typeof tool.id !== 'string') {
      throw new Error('AI_TOOL_VALIDATION_ERROR: Tool ID is required.');
    }
    const versions = this.tools.get(tool.id) || [];
    if (versions.some(v => v.version === tool.version)) {
      throw new Error(`AI_TOOL_VERSION_CONFLICT: Tool '${tool.id}' version ${tool.version} already exists.`);
    }
    versions.push(tool);
    versions.sort((a, b) => b.version - a.version);
    this.tools.set(tool.id, versions);
  }

  get(id: string, version?: number): ToolDefinition {
    const versions = this.tools.get(id);
    if (!versions || versions.length === 0) {
      throw new Error(`AI_TOOL_NOT_FOUND: Tool '${id}' not found.`);
    }
    if (version !== undefined) {
      const found = versions.find(v => v.version === version);
      if (!found) {
        throw new Error(`AI_TOOL_NOT_FOUND: Tool '${id}' version ${version} not found.`);
      }
      if (found.status !== 'ACTIVE') {
        throw new Error(`AI_TOOL_NOT_ACTIVE: Tool '${id}' version ${version} is not active.`);
      }
      return found;
    }
    const active = versions.find(v => v.status === 'ACTIVE');
    if (!active) {
      throw new Error(`AI_TOOL_NOT_ACTIVE: No active version for tool '${id}'.`);
    }
    return active;
  }

  getActive(id: string): ToolDefinition {
    return this.get(id);
  }

  resolveAllowedTools(allowedToolIds: string[]): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const id of allowedToolIds) {
      try {
        const tool = this.getActive(id);
        tools.push(tool);
      } catch {
        // skip inactive or missing tools
      }
    }
    return tools;
  }
}

export const globalToolRegistry = new ToolRegistry();
