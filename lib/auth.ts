import crypto from "crypto";
import { cookies } from "next/headers";

const token = () => crypto.createHmac("sha256", process.env.ADMIN_PASSWORD || "x").update("erine-admin").digest("hex");
const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const sessionToken = token;
export const passwordOk = (pw: string) => !!process.env.ADMIN_PASSWORD && same(pw, process.env.ADMIN_PASSWORD);
export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = (await cookies()).get("admin")?.value;
  return !!c && same(c, token());
}
