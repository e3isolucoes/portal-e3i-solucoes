async function probe(name, fn) {
  try {
    const value = await fn();
    return { name, ok: value !== false };
  } catch (error) {
    return { name, ok: false, error: error?.code || error?.name || 'ERROR' };
  }
}

export async function checkShadowIsolationHealth({
  intelligenceProbe,
  operationalProbes = {},
} = {}) {
  if (typeof intelligenceProbe !== 'function') {
    throw new TypeError('intelligenceProbe is required');
  }

  const intelligence = await probe('e3i-intelligence', intelligenceProbe);
  const operational = await Promise.all(
    Object.entries(operationalProbes).map(([name, fn]) => probe(name, fn)),
  );

  const operationHealthy = operational.every((item) => item.ok);
  const telemetryFailureIsolated = !intelligence.ok && operationHealthy;

  return {
    status: operationHealthy
      ? (intelligence.ok ? 'healthy' : 'degraded')
      : 'unhealthy',
    intelligence,
    operational,
    operationHealthy,
    telemetryFailureIsolated,
    rule: 'telemetry-failure-must-not-break-operation',
  };
}
