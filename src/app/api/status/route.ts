import type { NextRequest } from "next/server";
import { oneClick } from "@/lib/oneclick";

export async function GET(request: NextRequest) {
  const addr = request.nextUrl.searchParams.get("depositAddress");
  if (!addr || addr.length > 200) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    return Response.json(await oneClick.status(addr));
  } catch {
    return Response.json({ error: "status_unavailable" }, { status: 502 });
  }
}
