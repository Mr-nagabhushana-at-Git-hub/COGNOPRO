type LogScope = "ENGINE" | "ROUTER" | "PROVIDER" | "FAILOVER" | "CRISIS";

export function logEvent(scope: LogScope, event: string, details: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), scope: `[${scope}]`, event, ...details }));
}

export function logFailure(scope: LogScope, event: string, error: unknown, details: Record<string, unknown> = {}): void {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), scope: `[${scope}]`, event, reason, ...details }));
}
