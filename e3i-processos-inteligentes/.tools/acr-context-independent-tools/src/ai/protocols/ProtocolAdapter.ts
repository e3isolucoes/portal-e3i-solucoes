export interface ProtocolAdapter<TExternalPayload, TInternalPayload> {
  adaptInbound(external: TExternalPayload): TInternalPayload;
  adaptOutbound(internal: TInternalPayload): TExternalPayload;
}

export interface McpProtocolExtensionPoint {
  protocolName: 'MCP' | 'CUSTOM' | 'A2A';
  translateToolDefinition(tool: any): any;
  translateToolCall(call: any): any;
}
