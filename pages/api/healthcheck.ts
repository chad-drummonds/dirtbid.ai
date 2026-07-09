// =============================================================================
// DirtBid AI — Health Check API Endpoint
// =============================================================================

export function handleHealthCheck(): { status: string; version: string; timestamp: string } {
  return {
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  };
}
