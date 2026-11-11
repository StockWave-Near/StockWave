import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

// Public notebook: returns all gifts (no private fields).
// Sorted newest-first; capped at 200 entries for the page render.
// Never returns depositAddress, claimPublicKey, or recipientPhone.
export async function GET(request: Request) {
  if (!rateLimit(`notebook:${clientIp(request.headers)}`, 30, 60_000)) return tooMany();

  // Import the KV adapter at runtime (server-only).
  const { getAllGifts } = await import("@/lib/store");
  const gifts = await getAllGifts();

  const safe = gifts
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200)
    .map(({ id, stock, usd, note, senderAccount, status, createdAt }) => ({
      id, stock, usd, note, senderAccount, status, createdAt,
    }));

  return Response.json(safe);
}
