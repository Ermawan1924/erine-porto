"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Content, Project } from "@/lib/types";

type Tab = "profile" | "projects" | "experience" | "achievements";
const move = <T,>(a: T[], i: number, d: number) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return b; [b[i], b[j]] = [b[j], b[i]]; return b; };

export default function Editor({ initial, blobReady }: { initial: Content; blobReady: boolean }) {
  const [c, setC] = useState<Content>(initial);
  const [tab, setTab] = useState<Tab>("projects");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const set = (fn: (d: Content) => Content) => { setC((p) => fn(structuredClone(p))); setDirty(true); };

  async function save() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setDirty(false); setMsg({ t: "Saved! The site updates within a minute.", ok: true }); }
    else setMsg({ t: j.error || "Save failed", ok: false });
  }
  async function up(file: File): Promise<string> {
    const b = await upload(`uploads/${file.name}`, file, { access: "public", handleUploadUrl: "/api/upload" });
    return b.url;
  }
  async function logout() { await fetch("/api/logout", { method: "POST" }); location.reload(); }

  const field = (label: string, val: string, on: (v: string) => void, area = false) => (
    <>
      <label>{label}</label>
      {area ? <textarea value={val} onChange={(e) => on(e.target.value)} /> : <input value={val} onChange={(e) => on(e.target.value)} />}
    </>
  );

  const proj = (p: Project, i: number) => {
    const upd = (fn: (x: Project) => void) => set((d) => { fn(d.projects[i]); return d; });
    return (
      <div className="panel" key={p.id}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "var(--serif)" }}>{p.title || "Untitled"}</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => set((d) => { d.projects = move(d.projects, i, -1); return d; })}>↑</button>
            <button onClick={() => set((d) => { d.projects = move(d.projects, i, 1); return d; })}>↓</button>
            <button className="d" onClick={() => confirm(`Delete "${p.title}"?`) && set((d) => { d.projects.splice(i, 1); return d; })}>Delete</button>
          </div>
        </div>
        <div className="row">
          <div>{field("Title", p.title, (v) => upd((x) => (x.title = v)))}</div>
          <div>
            <label>Category</label>
            <select value={p.category} onChange={(e) => upd((x) => (x.category = e.target.value))}>
              {c.categories.map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>{field("Year", p.year, (v) => upd((x) => (x.year = v)))}</div>
        </div>
        {field("Description", p.description, (v) => upd((x) => (x.description = v)), true)}
        <label>Images (the outlined one is the cover)</label>
        <div className="thumbs">
          {p.images.map((src, k) => (
            <div key={src + k}>
              <img src={src} alt="" className={src === p.cover ? "cv" : ""} />
              <button className="t d" onClick={() => upd((x) => { x.images.splice(k, 1); if (x.cover === src) x.cover = x.images[0] || ""; })}>×</button>
              <button className="s" onClick={() => upd((x) => (x.cover = src))}>Set cover</button>
            </div>
          ))}
        </div>
        <label style={{ marginTop: 12 }}>Add images</label>
        <input type="file" accept="image/*" multiple disabled={!blobReady} onChange={async (e) => {
          const files = Array.from(e.target.files || []); e.target.value = "";
          if (!files.length) return; setMsg({ t: `Uploading ${files.length} image(s)…`, ok: true });
          try {
            const urls: string[] = [];
            for (const f of files) urls.push(await up(f));
            upd((x) => { x.images.push(...urls); if (!x.cover) x.cover = urls[0]; });
            setMsg({ t: "Uploaded. Remember to press Save.", ok: true });
          } catch (er) { setMsg({ t: "Upload failed: " + (er as Error).message, ok: false }); }
        }} />
      </div>
    );
  };

  return (
    <div className="adm">
      <header>
        <b>ADMIN · Erine&apos;s Portfolio</b>
        <div className="hb">
          <a href="/" target="_blank" style={{ color: "#fff", fontSize: 13 }}>View site ↗</a>
          <button className="p" onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
          <button onClick={logout}>Log out</button>
        </div>
      </header>
      <div className="wrap" style={{ paddingBottom: 80 }}>
        {!blobReady && <div className="msg er" style={{ marginTop: 20 }}>Vercel Blob isn&apos;t connected yet, so saving and uploading are disabled. In Vercel: Storage → Create → Blob → connect to this project, then redeploy.</div>}
        {msg && <div className={"msg " + (msg.ok ? "ok" : "er")} style={{ marginTop: 20 }}>{msg.t}</div>}
        <div className="tabs">
          {(["projects", "profile", "experience", "achievements"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {tab === "projects" && (<>
          <button className="p" style={{ marginBottom: 16 }} onClick={() => set((d) => { d.projects.unshift({ id: "p" + Date.now(), title: "New project", category: d.categories[0] || "", year: String(new Date().getFullYear()), description: "", cover: "", images: [] }); return d; })}>+ New project</button>
          {c.projects.map(proj)}
          <div className="panel">
            <h3>Categories</h3>
            <p style={{ fontSize: 13, color: "#666" }}>Comma-separated. Used for the filter buttons.</p>
            <input value={c.categories.join(", ")} onChange={(e) => set((d) => { d.categories = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); return d; })} />
          </div>
        </>)}

        {tab === "profile" && (
          <div className="panel">
            {(["name", "role", "tagline", "email", "phone", "behance", "instagram", "linkedin"] as const).map((k) => <div key={k}>{field(k[0].toUpperCase() + k.slice(1), c.profile[k], (v) => set((d) => { d.profile[k] = v; return d; }))}</div>)}
            {field("About me", c.profile.intro, (v) => set((d) => { d.profile.intro = v; return d; }), true)}
            <label>Photo (optional)</label>
            {c.profile.photo && <img src={c.profile.photo} alt="" style={{ width: 140, borderRadius: 10, marginBottom: 8 }} />}
            <input type="file" accept="image/*" disabled={!blobReady} onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const u = await up(f); set((d) => { d.profile.photo = u; return d; }); } catch (er) { setMsg({ t: (er as Error).message, ok: false }); }
            }} />
            {c.profile.photo && <button className="d" style={{ marginTop: 8 }} onClick={() => set((d) => { d.profile.photo = ""; return d; })}>Remove photo</button>}
          </div>
        )}

        {tab === "experience" && (<>
          <button className="p" style={{ marginBottom: 16 }} onClick={() => set((d) => { d.experience.push({ period: "", role: "", company: "" }); return d; })}>+ Add</button>
          {c.experience.map((e, i) => (
            <div className="panel" key={i}>
              <div className="row">
                <div>{field("Period", e.period, (v) => set((d) => { d.experience[i].period = v; return d; }))}</div>
                <div>{field("Role", e.role, (v) => set((d) => { d.experience[i].role = v; return d; }))}</div>
                <div>{field("Company", e.company, (v) => set((d) => { d.experience[i].company = v; return d; }))}</div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <button onClick={() => set((d) => { d.experience = move(d.experience, i, -1); return d; })}>↑</button>
                <button onClick={() => set((d) => { d.experience = move(d.experience, i, 1); return d; })}>↓</button>
                <button className="d" onClick={() => set((d) => { d.experience.splice(i, 1); return d; })}>Delete</button>
              </div>
            </div>
          ))}
        </>)}

        {tab === "achievements" && (<>
          <button className="p" style={{ marginBottom: 16 }} onClick={() => set((d) => { d.achievements.unshift({ level: "National", title: "", org: "" }); return d; })}>+ Add</button>
          {c.achievements.map((a, i) => (
            <div className="panel" key={i}>
              <div className="row">
                <div>{field("Level", a.level, (v) => set((d) => { d.achievements[i].level = v; return d; }))}</div>
                <div>{field("Title", a.title, (v) => set((d) => { d.achievements[i].title = v; return d; }))}</div>
                <div>{field("Organizer & year", a.org, (v) => set((d) => { d.achievements[i].org = v; return d; }))}</div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <button onClick={() => set((d) => { d.achievements = move(d.achievements, i, -1); return d; })}>↑</button>
                <button onClick={() => set((d) => { d.achievements = move(d.achievements, i, 1); return d; })}>↓</button>
                <button className="d" onClick={() => set((d) => { d.achievements.splice(i, 1); return d; })}>Delete</button>
              </div>
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
}
