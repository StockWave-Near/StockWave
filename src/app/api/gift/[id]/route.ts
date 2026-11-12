import { getGift } from "@/lib/store";
import { syncGiftFunding } from "@/lib/vault";
import { STOCKS } from "@/lib/stocks";

// Public gift info for the claim page. Never returns depositAddress or keys.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "not_found" }, { status: 404 });
  try { await syncGiftFunding(gift); } catch { /* keep current status */ }
  return Response.json({
    id: gift.id, stock: gift.stock, name: STOCKS[gift.stock].name, usd: gift.usd,
    note: gift.note, status: gift.status, createdAt: gift.createdAt,
  });
}
