import { getBasket, getGift } from "@/lib/store";
import { syncGiftFunding } from "@/lib/vault";
import { STOCKS } from "@/lib/stocks";

// Public basket info for the claim page: per-leg status. Never returns deposit addresses or keys.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const basket = await getBasket(id);
  if (!basket) return Response.json({ error: "not_found" }, { status: 404 });
  const legs = await Promise.all(basket.legIds.map(async (legId) => {
    const gift = await getGift(legId);
    if (!gift) return null;
    try { await syncGiftFunding(gift); } catch { /* keep current status */ }
    return { giftId: gift.id, stock: gift.stock, name: STOCKS[gift.stock].name, usd: gift.usd, status: gift.status };
  }));
  if (legs.some((l) => !l)) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({
    id: basket.id, name: basket.name, usd: basket.usd, note: basket.note,
    createdAt: basket.createdAt, legs,
  });
}
