"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, LogOut, Plus, Trash2, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calculateOverallAverage, calculateSubjectAverage, formatAverage, type GradeSystem } from "@/lib/calculations";

type Subject = { id: string; name: string; color: string; weight: number; grading_system: GradeSystem };
type Category = { id: string; subject_id: string; name: string; weight: number };
type Grade = { id: string; subject_id: string; category_id: string; value: number; weight: number; graded_at: string; comment: string | null };

const defaultScale: GradeSystem = {
  direction: "lower_is_better",
  scale: [
    { grade: 1, score: 100 }, { grade: 2, score: 80 }, { grade: 3, score: 60 },
    { grade: 4, score: 40 }, { grade: 5, score: 20 }, { grade: 6, score: 0 }
  ]
};

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showSubject, setShowSubject] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectWeight, setSubjectWeight] = useState("1");
  const [gradeSubject, setGradeSubject] = useState("");
  const [gradeCategory, setGradeCategory] = useState("");
  const [gradeValue, setGradeValue] = useState("");
  const [gradeWeight, setGradeWeight] = useState("1");
  const [gradeComment, setGradeComment] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) void loadData();
  }, [session?.user?.id]);

  async function loadData() {
    if (!supabase) return;
    const [s, c, g] = await Promise.all([
      supabase.from("subjects").select("id,name,color,weight,grading_system").order("name"),
      supabase.from("grade_categories").select("id,subject_id,name,weight").order("name"),
      supabase.from("grades").select("id,subject_id,category_id,value,weight,graded_at,comment").order("graded_at", { ascending: false })
    ]);
    if (s.error || c.error || g.error) {
      setMessage(s.error?.message || c.error?.message || g.error?.message || "Laden fehlgeschlagen.");
      return;
    }
    setSubjects((s.data || []) as Subject[]);
    setCategories((c.data || []) as Category[]);
    setGrades((g.data || []) as Grade[]);
  }

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!supabase) { setMessage("Bitte zuerst die Supabase-Zugangsdaten konfigurieren."); return; }
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) setMessage(result.error.message);
    else if (authMode === "register" && !result.data.session) setMessage("Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.");
  }

  async function addSubject(e: React.FormEvent) {
    e.preventEvent?.();
  }

  async function addGrade(e: React.FormEvent) {
    e.preventDefault();
  }

  async function deleteGrade(id: string) {
    if (!supabase || !confirm("Diese Note wirklich löschen?")) return;
    const { error } = await supabase.from("grades").delete().eq("id", id);
    if (error) setMessage(error.message); else await loadData();
  }

  async function deleteSubject(id: string) {
    if (!supabase || !confirm("Fach und zugehörige Daten wirklich löschen?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) setMessage(error.message); else await loadData();
  }

  const subjectStats = useMemo(() => subjects.map((subject) => {
    const cats = categories.filter((c) => c.subject_id === subject.id).map((category) => ({
      weight: category.weight,
      grades: grades.filter((g) => g.category_id === category.id).map((g) => ({ value: g.value, weight: g.weight }))
    }));
    return { ...subject, average: calculateSubjectAverage(cats, subject.grading_system) };
  }), [subjects, categories, grades]);

  const overall = calculateOverallAverage(subjectStats.map((s) => ({ average: s.average, weight: s.weight })));

  if (!supabase) return (
    <main className="auth-wrap"><section className="auth-card"><div className="brand"><GraduationCap /> GradeFlow</div><h1>Fast startklar.</h1><p>Lege eine <code>.env.local</code> mit deinen Supabase-Zugangsdaten an.</p></section></main>
  );

  if (!session) return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="brand"><GraduationCap /> GradeFlow</div>
        <p className="eyebrow">DEIN SCHULALLTAG. DEIN ÜBERBLICK.</p>
        <h1>{authMode === "login" ? "Willkommen zurück." : "Konto erstellen."}</h1>
        <p className="muted">Verwalte deine Noten, Fächer und Ziele an einem Ort.</p>
        <form onSubmit={authenticate} className="stack">
          <label>E-Mail-Adresse<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@beispiel.de" /></label>
          <label>Passwort<input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" /></label>
          <button className="primary" type="submit">{authMode === "login" ? "Anmelden" : "Registrieren"}</button>
        </form>
        <button className="text-button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setMessage(""); }}>
          {authMode === "login" ? "Noch kein Konto? Registrieren" : "Du hast bereits ein Konto? Anmelden"}
        </button>
        {message && <p className="notice">{message}</p>}
      </section>
    </main>
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><GraduationCap /> GradeFlow</div>
        <div className="side-label">MENÜ</div>
        <div className="nav-item active"><BookOpen size={18}/> Übersicht</div>
        <div className="side-foot">
          <span className="avatar">{(session.user.email || "G").slice(0, 1).toUpperCase()}</span>
          <span className="user-email">{session.user.email}</span>
          <button title="Abmelden" className="icon-button" onClick={() => supabase.auth.signOut()}><LogOut size={17}/></button>
        </div>
      </aside>
      <section className="main-content">
        <header className="topbar"><div><p className="eyebrow">DEIN LERNFORTSCHRITT</p><h1>Übersicht</h1></div><button className="secondary" onClick={() => setShowGrade(true)}><Plus size={17}/> Note eintragen</button></header>
        {message && <div className="notice">{message}<button onClick={() => setMessage("")}>×</button></div>}
        <section className="hero-card">
          <div><p className="hero-label">GEWICHTETER GESAMTDURCHSCHNITT</p><div className="hero-number">{formatAverage(overall)}<span> / 100</span></div><p className="hero-hint">Vergleichswert auf Basis deiner individuellen Notenskalen</p></div>
          <div className="hero-icon"><TrendingUp size={30}/></div>
        </section>
        <div className="stats-row">
          <div className="stat-card"><span>Fächer</span><strong>{subjects.length}</strong></div>
          <div className="stat-card"><span>Noten eingetragen</span><strong>{grades.length}</strong></div>
          <div className="stat-card"><span>Aktive Kategorien</span><strong>{categories.length}</strong></div>
        </div>
        <div className="section-heading"><div><p className="eyebrow">DEINE LERNBEREICHE</p><h2>Fächer</h2></div><button className="secondary" onClick={() => setShowSubject(true)}><Plus size={17}/> Fach hinzufügen</button></div>
        {subjects.length === 0 ? (
          <div className="empty"><BookOpen size={28}/><h3>Dein Überblick beginnt hier.</h3><p>Lege dein erstes Fach an und trage deine Noten ein.</p><button className="primary" onClick={() => setShowSubject(true)}>Erstes Fach erstellen</button></div>
        ) : (
          <div className="subject-grid">{subjectStats.map((s) => (
            <article className="subject-card" key={s.id}>
              <div className="subject-top"><span className="subject-dot" style={{background:s.color}}/><span className="weight-tag">Gewicht {s.weight}</span><button className="icon-button danger" title="Fach löschen" onClick={() => deleteSubject(s.id)}><Trash2 size={16}/></button></div>
              <h3>{s.name}</h3><div className="subject-average">{formatAverage(s.average)}<small> / 100</small></div>
              <div className="mini-track"><span style={{width:`${Math.max(0,Math.min(100,s.average || 0))}%`}}/></div>
              <p className="muted small">{grades.filter((g) => g.subject_id === s.id).length} Noten · {categories.filter((c) => c.subject_id === s.id).length} Kategorien</p>
            </article>
          ))}</div>
        )}
        <div className="section-heading recent-heading"><div><p className="eyebrow">ZULETZT ERFASST</p><h2>Letzte Noten</h2></div></div>
        <div className="table-card">
          {grades.length === 0 ? <p className="muted empty-table">Noch keine Noten vorhanden.</p> : (
            <div className="grade-list">{grades.slice(0, 8).map((g) => {
              const subject = subjects.find((s) => s.id === g.subject_id);
              const category = categories.find((c) => c.id === g.category_id);
              return <div className="grade-row" key={g.id}><div className="grade-bullet"/><div className="grade-info"><strong>{subject?.name || "Fach"}</strong><span>{category?.name || "Kategorie"} · {g.graded_at}</span>{g.comment && <small>{g.comment}</small>}</div><strong className="grade-value">{g.value}</strong><button className="icon-button danger" onClick={() => deleteGrade(g.id)} title="Note löschen"><Trash2 size={15}/></button></div>;
            })}</div>
          )}
        </div>
      </section>

      {showSubject && <div className="modal-backdrop" onMouseDown={(e) => { if(e.target === e.currentTarget) setShowSubject(false); }}><form className="modal" onSubmit={async (e) => {
        e.preventDefault();
        if (!supabase || !session?.user) return;
        const name = subjectName.trim();
        const weight = Number(subjectWeight);
        if (!name || !Number.isFinite(weight) || weight <= 0) { setMessage("Bitte gültigen Namen und Fachgewicht eingeben."); return; }
        const { data, error } = await supabase.from("subjects").insert({ user_id: session.user.id, name, color: "#6478e8", weight, grading_system: defaultScale }).select("id").single();
        if (error) { setMessage(error.message); return; }
        const { error: categoryError } = await supabase.from("grade_categories").insert([
          { user_id: session.user.id, subject_id: data.id, name: "Schriftlich", weight: 1 },
          { user_id: session.user.id, subject_id: data.id, name: "Mündlich", weight: 1 }
        ]);
        if (categoryError) setMessage(categoryError.message);
        setSubjectName(""); setShowSubject(false); await loadData();
      }}>
        <div className="modal-head"><h2>Neues Fach</h2><button type="button" className="icon-button" onClick={() => setShowSubject(false)}>×</button></div>
        <label>Fachname<input required autoFocus value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="z. B. Mathematik"/></label>
        <label>Gewichtung im Gesamtschnitt<input type="number" min="0.01" step="0.01" required value={subjectWeight} onChange={(e) => setSubjectWeight(e.target.value)}/></label>
        <button className="primary" type="submit">Fach erstellen</button>
      </form></div>}

      {showGrade && <div className="modal-backdrop" onMouseDown={(e) => { if(e.target === e.currentTarget) setShowGrade(false); }}><form className="modal" onSubmit={async (e) => {
        e.preventDefault();
        if (!supabase || !session?.user) return;
        const value = Number(gradeValue), weight = Number(gradeWeight);
        if (!gradeSubject || !gradeCategory || !Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) { setMessage("Bitte alle Felder gültig ausfüllen."); return; }
        const subject = subjects.find((s) => s.id === gradeSubject);
        if (!subject) return;
        const scale = subject.grading_system.scale;
        const min = Math.min(...scale.map((x) => x.grade));
        const max = Math.max(...scale.map((x) => x.grade));
        if (value < min || value > max) { setMessage(`Die Note muss zwischen ${min} und ${max} liegen.`); return; }
        const { error } = await supabase.from("grades").insert({ user_id: session.user.id, subject_id: gradeSubject, category_id: gradeCategory, value, weight, comment: gradeComment || null, graded_at: new Date().toISOString().slice(0, 10) });
        if (error) { setMessage(error.message); return; }
        setGradeValue(""); setGradeComment(""); setShowGrade(false); await loadData();
      }}>
        <div className="modal-head"><h2>Neue Note</h2><button type="button" className="icon-button" onClick={() => setShowGrade(false)}>×</button></div>
        <label>Fach<select required value={gradeSubject} onChange={(e) => {setGradeSubject(e.target.value);setGradeCategory("");}}><option value="">Fach auswählen</option>{subjects.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Kategorie<select required value={gradeCategory} onChange={(e)=>setGradeCategory(e.target.value)}><option value="">Kategorie auswählen</option>{categories.filter((c)=>c.subject_id===gradeSubject).map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className="form-grid"><label>Note<input type="number" required step="0.1" value={gradeValue} onChange={(e)=>setGradeValue(e.target.value)} placeholder="z. B. 2"/></label><label>Notengewicht<input type="number" required min="0.01" step="0.01" value={gradeWeight} onChange={(e)=>setGradeWeight(e.target.value)}/></label></div>
        <label>Kommentar (optional)<input value={gradeComment} onChange={(e)=>setGradeComment(e.target.value)} placeholder="z. B. Klassenarbeit Kapitel 3"/></label>
        <button className="primary" type="submit">Note speichern</button>
      </form></div>}
    </main>
  );
}
