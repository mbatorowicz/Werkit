export const sendRemoteLog = (level: 'INFO'|'WARN'|'ERROR'|'DEBUG', message: string, metadata?: any) => {
  if (typeof window === 'undefined') return;
  fetch('/api/worker/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, message, metadata }),
    keepalive: true
  }).catch(() => {});
};
