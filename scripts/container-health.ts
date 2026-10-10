const response = await fetch("http://127.0.0.1:8080/healthz", { signal: AbortSignal.timeout(2000) });
const health = await response.json();
if (!response.ok || health.ok !== true || health.revision !== process.env.APP_REVISION) {
  process.exit(1);
}
