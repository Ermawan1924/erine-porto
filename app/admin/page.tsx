import { isAdmin } from "@/lib/auth";
import { getContent } from "@/lib/content";
import Editor from "@/components/Editor";
import Login from "@/components/Login";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Admin() {
  if (!process.env.ADMIN_PASSWORD)
    return <div className="adm"><div className="login"><h3>Setup needed</h3><p>Add an <code>ADMIN_PASSWORD</code> environment variable in Vercel, then redeploy.</p></div></div>;
  if (!(await isAdmin())) return <Login />;
  return <Editor initial={await getContent()} blobReady={!!process.env.BLOB_READ_WRITE_TOKEN} />;
}
