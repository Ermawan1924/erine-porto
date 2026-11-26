import { list, put } from "@vercel/blob";
import { defaultContent } from "./default";
import type { Content } from "./types";

export async function getContent(): Promise<Content> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return defaultContent;
  try {
    const { blobs } = await list({ prefix: "content.json", limit: 1 });
    if (!blobs[0]) return defaultContent;
    const v = new Date(blobs[0].uploadedAt).getTime();
    const res = await fetch(`${blobs[0].url}?v=${v}`, { cache: "no-store" });
    return { ...defaultContent, ...(await res.json()) };
  } catch {
    return defaultContent;
  }
}

export async function saveContent(c: Content) {
  await put("content.json", JSON.stringify(c), {
    access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json",
  });
}
