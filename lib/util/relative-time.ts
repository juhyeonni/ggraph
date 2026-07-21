// resetAt is epoch seconds (from x-ratelimit-reset); now is a Date.now() in ms.
export function formatResetIn(resetAt: number, now: number): string {
  const seconds = resetAt - Math.floor(now / 1000);
  if (seconds <= 0) return "now";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} h`;
}
