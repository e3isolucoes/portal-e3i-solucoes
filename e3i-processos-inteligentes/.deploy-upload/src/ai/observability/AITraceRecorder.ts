import { AITraceRecord as TraceRecord } from './AITrace';

export class AITraceRecorder {
  private static traces: TraceRecord[] = [];

  static record(record: TraceRecord): void {
    // Privacy protection: ensure no raw user prompt or sensitive content is stored in traces
    const sanitizedRecord: TraceRecord = {
      ...record,
    };
    this.traces.unshift(sanitizedRecord);
    if (this.traces.length > 500) {
      this.traces.pop();
    }
  }

  static getTraces(organizationId?: string): TraceRecord[] {
    if (organizationId) {
      return this.traces.filter(t => t.organizationId === organizationId);
    }
    return [...this.traces];
  }

  static clear(): void {
    this.traces = [];
  }
}
