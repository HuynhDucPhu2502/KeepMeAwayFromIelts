import { connection } from "next/server";
import { hostPin, noStore, notFound, pinMatches, readJson, wrongPin } from "@/lib/party/pin";

// GET → { enabled }: whether party mode is switched on.
export async function GET() {
  await connection(); // read the env var per request, not at build time
  return Response.json({ enabled: Boolean(hostPin()) }, { headers: noStore });
}

// POST { pin } → { ok: true } or 401.
export async function POST(request: Request) {
  if (!hostPin()) return notFound();
  const body = await readJson(request);
  if (!pinMatches(body.pin)) return wrongPin();
  return Response.json({ ok: true }, { headers: noStore });
}
