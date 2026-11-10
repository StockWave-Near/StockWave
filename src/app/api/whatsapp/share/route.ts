import { whatsappShareUrl } from "@/lib/whatsapp";

// Builds a wa.me share URL for a gift link. The link (with its #k= fragment) is passed in
// by the sender's browser and is NOT stored or logged here.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    link?: string;
    senderName?: string;
    stock?: string;
    usd?: number;
    phone?: string;
  } | null;
  if (!body?.link || body.link.length > 2000 || !/^https?:\/\//.test(body.link)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  return Response.json({ url: whatsappShareUrl({ ...body, link: body.link }) });
}
