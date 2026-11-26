import { getContent } from "@/lib/content";
import Portfolio from "@/components/Portfolio";

export const revalidate = 60;

export default async function Home() {
  const { profile: p, experience, achievements, categories, projects } = await getContent();
  const links = [["Behance", p.behance], ["Instagram", p.instagram], ["LinkedIn", p.linkedin]].filter(([, u]) => u);
  return (
    <>
      <nav><div className="wrap">
        <b>ERINE PALBA</b>
        <div><a href="#about">About</a><a href="#work">Work</a><a href="#awards">Awards</a><a className="keep" href="#contact">Contact</a></div>
      </div></nav>

      <header className="hero">
        <div className="wrap">
          <small>{p.name}</small>
          <h1>PORT<br />FOLIO</h1>
          <p>{p.tagline}</p>
          <a className="btn" href="#work">View work</a>
        </div>
        <div className="arc" />
      </header>

      <section id="about"><div className="wrap about">
        <div>
          <h2>Hello, I&apos;m Erine<i /></h2>
          <p>{p.intro}</p>
          <div className="tags"><span>Illustration</span><span>Graphic Design</span><span>Mascot & Character</span></div>
          <div className="photo" style={{ marginTop: 32, aspectRatio: "16/10", fontSize: 0, display: p.photo ? "block" : "none" }}>
            {p.photo && <img src={p.photo} alt={p.name} />}
          </div>
        </div>
        <div className="card">
          <h3>EXPERIENCE</h3>
          {experience.map((e, i) => (
            <div className="exp" key={i}><em>{e.period}</em><b>{e.role}</b><span>{e.company}</span></div>
          ))}
        </div>
      </div></section>

      <section id="work"><div className="wrap">
        <h2>Selected Work<i /></h2>
        <Portfolio projects={projects} categories={categories} />
      </div></section>

      <section id="awards"><div className="wrap">
        <h2>Achievements<i /></h2>
        <div className="ach">
          {achievements.map((a, i) => (
            <div key={i}><em>{a.level}</em><b>{a.title}</b><span>{a.org}</span></div>
          ))}
        </div>
      </div></section>

      <section id="contact" className="contact"><div className="wrap">
        <h2>Let&apos;s create<br />something together</h2>
        <div className="links">
          {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
          {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>}
          {links.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer">{n}</a>)}
        </div>
      </div></section>
      <footer>© {new Date().getFullYear()} {p.name}</footer>
    </>
  );
}
