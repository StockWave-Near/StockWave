import type { NextRequest } from "next/server";
import { oneClick } from "@/lib/oneclick";
import { findByDeposit } from "@/lib/store";
import { syncGiftFunding } from "@/lib/vault";

export async function GET(request: NextRequest) {
  const addr = request.nextUrl.searchParams.get("depositAddress");
  if (!addr || addr.length > 200) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const res = await oneClick.status(addr);
    if (res.status === "SUCCESS") {
      // Register the gift on the vault as soon as the sender's browser sees the swap succeed.
      const gift = await findByDeposit(addr);
      if (gift) {
        await syncGiftFunding(gift).catch(() => {});
        if (gift.status !== "FUNDED") return Response.json({ ...res, status: "PROCESSING" });
      }
    }
    return Response.json(res);
  } catch {
    return Response.json({ error: "status_unavailable" }, { status: 502 });
  }
}
