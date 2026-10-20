// Next.js/Vercel runtime. Sites aliases this module to game-cloudflare.ts.
// Room state stays in the existing D1 backend instead of process-local memory.
const backend = process.env.GAME_BACKEND_URL || "https://stada-mbr-ai.miashecks.chatgpt.site";
async function proxy(request: Request) {
  const incoming = new URL(request.url);
  const target = new URL("/api/game", backend);
  target.search = incoming.search;
  if (target.origin === incoming.origin) {
    return Response.json({ error: "The game backend URL must point to the Sites backend." }, { status: 503 });
  }
  const headers = new Headers({ "Content-Type": "application/json" });
  const authorization = request.headers.get("Authorization");
  if (authorization) headers.set("Authorization", authorization);
  try {
    const response = await fetch(target, {
      method: request.method, headers,
      ...(request.method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000),
    });
    if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("Unexpected backend response");
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The game service is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export const GET = proxy;
export const POST = proxy;
