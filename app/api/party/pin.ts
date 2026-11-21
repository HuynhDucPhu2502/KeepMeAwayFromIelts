// Server-only helpers for the party host PIN. Party mode is on only when PARTY_HOST_PIN is set.
import { createHash, timingSafeEqual } from "node:crypto";

export function hostPin(): string | null {
  const pin = process.env.PARTY_HOST_PIN?.trim();
  return pin ? pin : null;
}

/** Constant-time PIN check (both sides hashed first, so the buffers always have equal length). */
export function pinMatches(input: unknown): boolean {
  const pin = hostPin();
  if (!pin || typeof input !== "string") return false;
  const a = createHash("sha256").update(input.trim()).digest();
  const b = createHash("sha256").update(pin).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export const noStore = { "Cache-Control": "no-store" };

export const notFound = () => Response.json({ error: "not found" }, { status: 404, headers: noStore });

/** Slows down PIN guessing a little; booth demo only, not a real rate limiter. */
export const wrongPin = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return Response.json({ ok: false }, { status: 401, headers: noStore });
};

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
