"use client";
import { useState } from "react";
export default function Login() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.reload(); else setErr("Wrong password");
  }
  return (
    <div className="adm"><form className="login" onSubmit={go}>
      <h3 style={{ fontFamily: "var(--serif)", marginBottom: 12 }}>Admin login</h3>
      <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      {err && <p style={{ color: "#b33", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <button className="p" style={{ marginTop: 14, width: "100%" }}>Sign in</button>
    </form></div>
  );
}
