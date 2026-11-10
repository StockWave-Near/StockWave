import { oneClick, OneClickError } from "@/lib/oneclick";

export async function GET() {
  try {
    return Response.json(await oneClick.tokens());
  } catch (e) {
    const status = e instanceof OneClickError ? 502 : 500;
    return Response.json({ error: "tokens_unavailable" }, { status });
  }
}
