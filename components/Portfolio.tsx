"use client";
import { useState, useEffect } from "react";
import type { Project } from "@/lib/types";

export default function Portfolio({ projects, categories }: { projects: Project[]; categories: string[] }) {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<Project | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", k);
    document.body.style.overflow = open ? "hidden" : "";
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const shown = cat === "All" ? projects : projects.filter((p) => p.category === cat);
  return (
    <>
      <div className="filters">
        {["All", ...categories].map((c) => (
          <button key={c} className={c === cat ? "on" : ""} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="grid">
        {shown.map((p) => (
          <button className="tile" key={p.id} onClick={() => setOpen(p)} aria-label={`Open ${p.title}`}>
            {p.cover && <img src={p.cover} alt={p.title} loading="lazy" />}
            <div><small>{p.category} · {p.year}</small><b>{p.title}</b></div>
          </button>
        ))}
      </div>
      {open && (
        <div className="lb" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <button className="x" aria-label="Close">×</button>
          <div className="in" onClick={(e) => e.stopPropagation()}>
            <small>{open.category} · {open.year}</small>
            <h3>{open.title}</h3>
            <p style={{ margin: "8px 0 24px", opacity: 0.85 }}>{open.description}</p>
            {(open.images.length ? open.images : [open.cover]).filter(Boolean).map((src) => (
              <img key={src} src={src} alt={open.title} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
