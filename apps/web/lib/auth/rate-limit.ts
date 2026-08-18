import "server-only";

/**
 * Simple in-memory fixed-window rate limiter, keyed by an arbitrary string
 * (we use client IP + route). This is real rate limiting, not a placeholder
 * — but it's scoped to a single server process: fine for local/self-hosted
 * use (which is this app's whole premise), but a multi-instance production
 * deployment would need a shared store (e.g. Redis) instead, since each
 * instance would otherwise track its own separate counters.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Periodic sweep so this Map doesn't grow unboundedly on a long-running dev
// server. Not critical (windows are short) but cheap to do right.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
