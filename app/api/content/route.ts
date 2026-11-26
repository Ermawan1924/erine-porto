import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { saveContent } from "@/lib/content";
export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Connect a Vercel Blob store first (BLOB_READ_WRITE_TOKEN missing)." }, { status: 500 });
  const body = await req.json();
  if (!body?.profile || !Array.isArray(body.projects)) return NextResponse.json({ error: "Bad content" }, { status: 400 });
  await saveContent(body);
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
