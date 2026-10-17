"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { useApp } from "../../components/AppProvider";
import AIInsight from "../../components/AIInsight";
import { runPuter } from "../../lib/ai";
import { api } from "../../lib/api";
import { Download, FileText, Plus, Trash2, Printer, BrainCircuit, Upload, Link2, Sparkles, Save, ShieldCheck, BriefcaseBusiness, BookOpenCheck } from "lucide-react";

type ProjectItem = { id: string; name: string; description: string; repoUrl: string; demoUrl: string; stack: string };
type ResumeForm = { name: string; headline: string; email: string; phone: string; location: string; linkedin: string; github: string; portfolio: string; role: string; summary: string; skills: string; experience: string; education: string; certifications: string };
type SkillSignal = { competency: string; signal_percent: number; has_signal: boolean; status: string; evidence_count: number; assessment_answer_count: number; practice_attempt_count: number; claim_count: number };
const DRAFT_KEY = "skillsetra_resume_builder_v1";
const initialForm: ResumeForm = { name: "", headline: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "", role: "", summary: "", skills: "", experience: "", education: "", certifications: "" };
const starterProject = (id = "project-default"): ProjectItem => ({ id, name: "", description: "", repoUrl: "", demoUrl: "", stack: "" });

function esc(value: unknown): string { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function validWebUrl(value: string): boolean { if (!value.trim()) return true; try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
function bulletHtml(text: string): string { return text.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(x => `<li>${esc(x.replace(/^[-•*]\s*/, ""))}</li>`).join(""); }

export default function ResumeBuilder() {
  const { user } = useApp();
  const [tab, setTab] = useState<"builder" | "analysis">("builder");
  const [form, setForm] = useState<ResumeForm>(initialForm);
  const [projects, setProjects] = useState<ProjectItem[]>([starterProject()]);
  const [roleSkills, setRoleSkills] = useState<SkillSignal[]>([]);
  const [roleProgress, setRoleProgress] = useState<any>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const hasSavedDraftRef = useRef(false);
  const [saveState, setSaveState] = useState("Draft stays in this browser until you export it.");
  const providerModel = "openai/gpt-oss-20b";
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [busy, setBusy] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.form && typeof saved.form === "object") {
          const restored = { ...initialForm, ...saved.form };
          if (String(restored.role || "").trim() === "Full-Stack Developer") restored.role = "";
          if (String(restored.headline || "").trim() === "Full-Stack Developer" && !restored.role) restored.headline = "";
          setForm(restored);
        }
        if (Array.isArray(saved?.projects) && saved.projects.length) setProjects(saved.projects);
        hasSavedDraftRef.current = true;
      }
    } catch { localStorage.removeItem(DRAFT_KEY); }
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    Promise.allSettled([api<any>("/api/v1/profile"), api<any>("/api/v1/projects"), api<any>("/api/v1/analytics"), api<any>("/api/v1/resume/draft")]).then(([profileResult, projectsResult, analyticsResult, resumeResult]) => {
      const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
      const projectResponse = projectsResult.status === "fulfilled" ? projectsResult.value : null;
      const analytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
      const serverDraft = resumeResult.status === "fulfilled" ? resumeResult.value?.draft : null;
      if (serverDraft?.form && typeof serverDraft.form === "object") {
        const restored = { ...initialForm, ...serverDraft.form };
        if (String(restored.role || "").trim() === "Full-Stack Developer" && !user?.targetRole) restored.role = "";
        setForm(restored);
        if (Array.isArray(serverDraft.projects) && serverDraft.projects.length) setProjects(serverDraft.projects.map((p:any,i:number)=>({ ...starterProject(String(p.id||`project-cloud-${i+1}`)), ...p, repoUrl:String(p.repoUrl||""), demoUrl:String(p.demoUrl||""), stack:String(p.stack||"") })));
        hasSavedDraftRef.current = true;
        setSaveState("Resume restored from your Skillsetra workspace.");
      }
      const selectedRole = String(user?.targetRole || profile?.target_role || "").trim();
      if (profile || selectedRole) setForm(current => {
        const role = selectedRole || (current.role === "Full-Stack Developer" ? "" : current.role);
        const headline = !current.headline || current.headline === "Full-Stack Developer" || current.headline === current.role ? role : current.headline;
        return { ...current, name: current.name || profile?.name || "", role, headline };
      });
      if (!hasSavedDraftRef.current && projectResponse?.items?.length) {
        const mapped = projectResponse.items.map((p: any, index: number) => ({ id: String(p.id || `project-import-${index + 1}`), name: String(p.name || ""), description: String(p.description || ""), repoUrl: String(p.repo_url || p.source_url || p.github_url || ""), demoUrl: String(p.demo_url || p.live_url || ""), stack: Array.isArray(p.stack) ? p.stack.join(", ") : String(p.stack || "") }));
        if (mapped.length) setProjects(mapped);
      }
      if (analytics?.role_progress) { setRoleProgress(analytics.role_progress); setRoleSkills(analytics.role_progress.skills || []); }
    });
  }, [draftLoaded, user?.targetRole]);

  useEffect(() => {
    if (!draftLoaded) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, projects })); setSaveState("Draft saved locally · not uploaded to the server."); }
    catch { setSaveState("Browser storage is unavailable. Export the resume to keep a copy."); }
  }, [draftLoaded, form, projects]);

  const skills = useMemo(() => form.skills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean), [form.skills]);
  const validLinks = validWebUrl(form.github) && validWebUrl(form.linkedin) && validWebUrl(form.portfolio) && projects.every(p => validWebUrl(p.repoUrl) && validWebUrl(p.demoUrl));

  function update<K extends keyof ResumeForm>(key: K, value: ResumeForm[K]) { setForm(current => ({ ...current, [key]: value })); }
  function updateProject(id: string, key: keyof ProjectItem, value: string) { setProjects(current => current.map(p => p.id === id ? { ...p, [key]: value } : p)); }
  function importSkills() {
    const candidates = roleSkills.filter(s => s.has_signal && Number(s.signal_percent) >= 60).map(s => s.competency);
    if (!candidates.length) { setError("No role skills have a recorded signal of 60% or more yet. Complete an assessment or practice first, or enter your skills manually."); return; }
    update("skills", [...new Set([...skills, ...candidates])].join(", ")); setError("");
  }

  async function saveResumeToWorkspace() {
    setCloudSaving(true); setError("");
    try {
      const result = await api<any>("/api/v1/resume/draft", { method:"POST", body:JSON.stringify({form,projects,updated_at:new Date().toISOString()}) });
      if (!result?.saved) throw new Error("The workspace did not confirm the resume save.");
      hasSavedDraftRef.current = true;
      setSaveState("Saved to your Skillsetra workspace · available in Show my claims & records.");
    } catch (e:any) {
      setError(e?.message || "Resume could not be saved to your workspace. Your browser draft remains available.");
      setSaveState("Cloud save failed · local browser draft retained.");
    } finally { setCloudSaving(false); }
  }

  function resumeHtml(withPassport: boolean) {
    const profileName = form.name.trim() || "Your Name";
    const projectHtml = projects.filter(p => p.name.trim()).map(p => `<article><h3>${esc(p.name)}</h3>${p.stack.trim() ? `<p><b>Stack:</b> ${esc(p.stack)}</p>` : ""}${p.description.trim() ? `<p>${esc(p.description)}</p>` : ""}<p>${p.repoUrl ? `<a href="${esc(p.repoUrl)}">Repository</a>` : ""}${p.repoUrl && p.demoUrl ? " · " : ""}${p.demoUrl ? `<a href="${esc(p.demoUrl)}">Live demo</a>` : ""}</p></article>`).join("");
    const contact = [form.email, form.phone, form.location, form.linkedin, form.github, form.portfolio].filter(Boolean).map(esc).join(" · ");
    const skillItems = skills.map(s => `<span class="skill">${esc(s)}</span>`).join("");
    const graph = roleSkills.map(s => `<tr><td>${esc(s.competency)}</td><td>${s.has_signal ? `${Number(s.signal_percent) || 0}%` : "Not assessed"}</td><td>${Number(s.assessment_answer_count) || 0}</td><td>${Number(s.evidence_count) || 0}</td><td>${Number(s.claim_count) || 0}</td><td>${esc(s.status || "No evidence yet")}</td></tr>`).join("");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(profileName)} · Resume</title><style>*{box-sizing:border-box}body{max-width:900px;margin:28px auto;padding:0 32px;color:#1a2435;font:14px/1.55 Arial,sans-serif}h1{font-size:30px;margin:0;color:#183d78}h2{font-size:17px;border-bottom:2px solid #dce5f5;padding-bottom:5px;margin-top:24px;color:#183d78}h3{font-size:15px;margin:12px 0 2px}.headline{font-size:17px;color:#405878;margin:4px 0}.contact{font-size:12px;color:#52637a;border-bottom:1px solid #d6deeb;padding-bottom:14px}p{white-space:pre-wrap}.skill{display:inline-block;border:1px solid #c9d6e8;border-radius:12px;padding:3px 8px;margin:3px;font-size:12px}a{color:#2156a8;overflow-wrap:anywhere}li{margin:4px 0}.passport{page-break-before:always}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #d7dfeb;text-align:left;padding:6px;vertical-align:top}.note{background:#f4f7fc;padding:12px;border-radius:8px;color:#45546b;font-size:12px}@media print{body{margin:0;padding:0;max-width:none}a{color:inherit;text-decoration:none}}</style></head><body><header><h1>${esc(profileName)}</h1><div class="headline">${esc(form.headline || form.role)}</div><div class="contact">${contact || "Add contact details in the resume editor"}</div></header>${form.summary.trim() ? `<h2>Professional Summary</h2><p>${esc(form.summary)}</p>` : ""}${skills.length ? `<h2>Skills</h2><div>${skillItems}</div>` : ""}${form.experience.trim() ? `<h2>Experience</h2><ul>${bulletHtml(form.experience)}</ul>` : ""}${projectHtml ? `<h2>Projects</h2>${projectHtml}` : ""}${form.education.trim() ? `<h2>Education</h2><ul>${bulletHtml(form.education)}</ul>` : ""}${form.certifications.trim() ? `<h2>Certifications</h2><ul>${bulletHtml(form.certifications)}</ul>` : ""}${withPassport ? `<section class="passport"><h1>Skillsetra · Career Passport</h1><p>Target role: <b>${esc(roleProgress?.role || form.role)}</b> · Overall role signal: <b>${roleProgress?.score == null ? "Not scored" : `${Number(roleProgress.score)}%`}</b></p><p class="note">This is an evidence-informed progress snapshot, not a credential or hiring decision. Assessment/practice scores are signals; only inspected artifacts or independently verified evidence should be represented as verified.</p><p>Assessment coverage: ${Number(roleProgress?.assessment_coverage_percent) || 0}% (${Number(roleProgress?.assessment_covered_skill_count) || 0}/${Number(roleProgress?.required_skill_count) || 0} required skills). Evidence coverage: ${Number(roleProgress?.evidence_coverage_percent) || 0}% (${Number(roleProgress?.evidence_covered_skill_count) || 0}/${Number(roleProgress?.required_skill_count) || 0}). Open gaps: ${Number(roleProgress?.gap_count) || 0}.</p><h2>Competency evidence graph</h2><table><thead><tr><th>Required competency</th><th>Performance signal</th><th>Assessment answers</th><th>Artifacts</th><th>Claims</th><th>Status</th></tr></thead><tbody>${graph || `<tr><td colspan="6">No competency evidence has been recorded yet.</td></tr>`}</tbody></table><h2>Project repositories</h2>${projects.filter(p => p.name.trim()).map(p => `<p><b>${esc(p.name)}</b> ${p.repoUrl ? `· <a href="${esc(p.repoUrl)}">Repository</a>` : "· Repository link not supplied"}${p.demoUrl ? ` · <a href="${esc(p.demoUrl)}">Demo</a>` : ""}</p>`).join("") || "<p>No project links supplied.</p>"}<p class="note">Exported ${esc(new Date().toLocaleDateString())}. The passport reports current workspace counts and user-provided links. It does not independently inspect source control or validate claims.</p></section>` : ""}</body></html>`;
  }
  function download(withPassport = false) {
    if (!validLinks) { setError("Please use full http:// or https:// URLs for profile, repository and demo links."); return; }
    try { const blob = new Blob([resumeHtml(withPassport)], { type: "text/html;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${(form.name || "Skillsetra-Resume").trim().replace(/[^a-z0-9]+/gi, "-")}${withPassport ? "-Career-Passport" : "-Resume"}.html`; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setError(""); }
    catch { setError("Could not download the resume in this browser."); }
  }
  function printResume() {
    if (!validLinks) { setError("Please use full http:// or https:// URLs for profile, repository and demo links."); return; }
    const url = URL.createObjectURL(new Blob([resumeHtml(false)], { type: "text/html;charset=utf-8" }));
    const preview = window.open(url, "_blank");
    if (!preview) { URL.revokeObjectURL(url); setError("The browser blocked the print window. Use Download HTML instead."); return; }
    try { preview.opener = null; } catch {}
    window.setTimeout(() => { try { preview.print(); } catch {} URL.revokeObjectURL(url); }, 700);
  }
  async function extractFile(file?: File) {
    if (!file) return;
    setFileName(file.name); setError(""); setResumeText("");
    if (file.size > 5 * 1024 * 1024) { setError("Choose a file under 5 MB."); return; }
    try { const formData = new FormData(); formData.append("file", file); const result = await api<any>("/api/v1/resume/extract", { method: "POST", body: formData }); setResumeText(result.text || ""); }
    catch (e: any) { setError(e.message || "Extraction failed. You can paste the resume text manually."); }
  }
  async function analyzeResume() {
    if (!consent) { setError("Confirm consent before sending resume text to AI service."); return; }
    setBusy(true); setError("");
    try {
      const prompt = `Analyze this resume for target role ${form.role}. Separate observed facts from inference. Return role fit (not a hiring prediction), evidenced skills, unsupported claims, project/technical depth, missing competencies, concrete improvements and 3 retest questions. Never invent credentials. Resume:\n${resumeText.slice(0, 6000)}`;
      setAnalysis(await runPuter(prompt, providerModel));
    } catch (e: any) { setError(e.message || "Resume analysis failed."); }
    finally { setBusy(false); }
  }

  return <AppLayout><div className="page resume-builder-page">
    <div className="page-head"><div><div className="eyebrow">Build · Resume and career passport</div><h1>Build a resume from your skills and project proof.</h1><p>Live preview, repository/demo links, downloadable resume and an optional evidence-informed Career Passport. Only information you enter or that exists in the workspace is included.</p></div><FileText/></div>
    <div className="action-row resume-tabs" role="tablist" aria-label="Resume tools"><button className={`button ${tab === "builder" ? "primary" : "secondary"}`} role="tab" aria-selected={tab === "builder"} onClick={() => setTab("builder")}>Resume builder</button><button className={`button ${tab === "analysis" ? "primary" : "secondary"}`} role="tab" aria-selected={tab === "analysis"} onClick={() => setTab("analysis")}>Resume analysis</button></div>
    {tab === "builder" ? <>
      <section className="panel resume-builder-actions"><div className="panel-head"><div><div className="eyebrow">Real-time resume editor</div><h2>{form.name || "Your name"} · {form.role}</h2></div><div className="tag good"><Save size={13}/> Browser draft</div></div><div className="action-row"><button className="button" onClick={importSkills}><Sparkles size={14}/> Import role skills with recorded signals</button><button className="button primary" onClick={saveResumeToWorkspace} disabled={cloudSaving}><Save size={14}/>{cloudSaving?"Saving to workspace…":"Save to workspace"}</button><button className="button" onClick={() => { setForm(initialForm); setProjects([starterProject()]); setError(""); }}><Trash2 size={14}/> Clear form</button><span className="muted">{saveState}</span></div><p className="muted resume-cloud-note">Saving sends the resume fields and project links to your private workspace. Until you save, the draft stays in this browser only.</p>{error && <p className="error" role="alert">{error}</p>}</section>
      <div className="grid grid-2 resume-builder-grid"><section className="panel"><div className="panel-head"><div><div className="eyebrow">1 · Profile</div><h2>Contact and target</h2></div><BriefcaseBusiness/></div>
        <div className="grid grid-2"><div className="field"><label htmlFor="resume-name">Name</label><input id="resume-name" value={form.name} onChange={e => update("name", e.target.value)} placeholder="Your name"/></div><div className="field"><label htmlFor="resume-role">Target role</label><input id="resume-role" value={form.role} onChange={e => update("role", e.target.value)} placeholder="Target role"/></div><div className="field"><label htmlFor="resume-headline">Headline</label><input id="resume-headline" value={form.headline} onChange={e => update("headline", e.target.value)} placeholder="Backend Developer · Python · APIs"/></div><div className="field"><label htmlFor="resume-email">Email</label><input id="resume-email" type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com"/></div><div className="field"><label htmlFor="resume-phone">Phone (optional)</label><input id="resume-phone" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="Phone number"/></div><div className="field"><label htmlFor="resume-location">Location</label><input id="resume-location" value={form.location} onChange={e => update("location", e.target.value)} placeholder="City, country"/></div><div className="field"><label htmlFor="resume-github">GitHub profile</label><input id="resume-github" value={form.github} onChange={e => update("github", e.target.value)} placeholder="https://github.com/…"/></div><div className="field"><label htmlFor="resume-linkedin">LinkedIn profile</label><input id="resume-linkedin" value={form.linkedin} onChange={e => update("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…"/></div><div className="field"><label htmlFor="resume-portfolio">Portfolio / live site</label><input id="resume-portfolio" value={form.portfolio} onChange={e => update("portfolio", e.target.value)} placeholder="https://…"/></div></div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="resume-summary">Professional summary</label><textarea id="resume-summary" value={form.summary} onChange={e => update("summary", e.target.value)} rows={4} placeholder="Summarize relevant experience, work you can demonstrate, and the roles you target."/></div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="resume-skills">Skills (comma, semicolon or newline separated)</label><textarea id="resume-skills" value={form.skills} onChange={e => update("skills", e.target.value)} rows={3} placeholder="Python, REST APIs, SQL, testing…"/><small className="muted">Only list skills you are comfortable explaining in an interview. Imported role signals are suggestions, not certifications.</small></div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="resume-experience">Experience (one bullet per line)</label><textarea id="resume-experience" value={form.experience} onChange={e => update("experience", e.target.value)} rows={5} placeholder="Role · organization · dates — impact and how you measured it"/></div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="resume-education">Education (one bullet per line)</label><textarea id="resume-education" value={form.education} onChange={e => update("education", e.target.value)} rows={3} placeholder="Degree / course · institution · year"/></div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="resume-certifications">Certifications / awards (one per line)</label><textarea id="resume-certifications" value={form.certifications} onChange={e => update("certifications", e.target.value)} rows={3} placeholder="Only add credentials you actually earned."/></div>
      </section>
      <section className="panel"><div className="panel-head"><div><div className="eyebrow">2 · Project proof</div><h2>Projects and repository links</h2></div><Link2/></div><p className="muted">Add public repository or live-demo URLs so a reviewer can inspect the real work. A link is not proof that every claim in the project description is correct.</p>
        {projects.map((project, index) => <article className="resume-project-card" key={project.id}><div className="panel-head"><h3>Project {index + 1}</h3><button type="button" className="button secondary" aria-label={`Remove project ${index + 1}`} onClick={() => setProjects(current => current.filter(p => p.id !== project.id))} disabled={projects.length === 1}><Trash2 size={14}/> Remove</button></div><div className="field"><label htmlFor={`resume-project-name-${project.id}`}>Project name</label><input id={`resume-project-name-${project.id}`} value={project.name} onChange={e => updateProject(project.id, "name", e.target.value)} placeholder="Project name"/></div><div className="field" style={{ marginTop: 8 }}><label htmlFor={`resume-project-desc-${project.id}`}>What you built / evidence</label><textarea id={`resume-project-desc-${project.id}`} value={project.description} onChange={e => updateProject(project.id, "description", e.target.value)} rows={3} placeholder="Problem, your contribution, tests/results and limitations"/></div><div className="field" style={{ marginTop: 8 }}><label htmlFor={`resume-project-stack-${project.id}`}>Technology stack</label><input id={`resume-project-stack-${project.id}`} value={project.stack} onChange={e => updateProject(project.id, "stack", e.target.value)} placeholder="Python, Next.js, FastAPI…"/></div><div className="grid grid-2" style={{ marginTop: 8 }}><div className="field"><label htmlFor={`resume-project-repo-${project.id}`}>Repository URL</label><input id={`resume-project-repo-${project.id}`} value={project.repoUrl} onChange={e => updateProject(project.id, "repoUrl", e.target.value)} placeholder="https://github.com/you/project"/></div><div className="field"><label htmlFor={`resume-project-demo-${project.id}`}>Live demo URL</label><input id={`resume-project-demo-${project.id}`} value={project.demoUrl} onChange={e => updateProject(project.id, "demoUrl", e.target.value)} placeholder="https://…"/></div></div></article>)}
        <button type="button" className="button" style={{ marginTop: 10 }} onClick={() => setProjects(current => [...current, starterProject(`project-${Date.now()}-${current.length}`)])}><Plus size={14}/> Add project</button>
        <div className="resume-export-panel"><div className="eyebrow">3 · Export</div><h2>Download your resume</h2><p className="muted">HTML keeps clickable links and preserves layout. Use Print / Save as PDF for a PDF file. Career Passport appends a transparent role-signal/evidence snapshot from your Skillsetra workspace.</p><div className="action-row"><button type="button" className="button primary" onClick={() => download(false)} disabled={!validLinks}><Download size={15}/> Download resume</button><button type="button" className="button" onClick={printResume} disabled={!validLinks}><Printer size={15}/> Print / Save PDF</button><button type="button" className="button secondary" onClick={() => download(true)} disabled={!validLinks}><ShieldCheck size={15}/> Resume + Career Passport</button></div>{!validLinks && <p className="error">One or more URLs is invalid. Use the complete https:// or http:// address.</p>}<small className="muted">Career Passport signal: {roleProgress?.score == null ? "not scored" : `${roleProgress.score}%`} · assessment coverage {roleProgress?.assessment_coverage_percent ?? 0}% · evidence coverage {roleProgress?.evidence_coverage_percent ?? 0}% · open gaps {roleProgress?.gap_count ?? 0}.</small></div>
      </section></div>
      <section className="panel resume-preview-panel"><div className="panel-head"><div><div className="eyebrow">Live preview</div><h2>{form.name || "Your Name"}</h2><p className="muted">Preview updates as you edit. Export output is generated directly from these fields.</p></div><FileText/></div><div className="resume-live-preview"><h1>{form.name || "Your Name"}</h1><h3>{form.headline || form.role}</h3><p className="muted">{[form.email, form.phone, form.location, form.github, form.linkedin, form.portfolio].filter(Boolean).join(" · ")}</p>{form.summary && <section><h2>Professional Summary</h2><p>{form.summary}</p></section>}{skills.length > 0 && <section><h2>Skills</h2><div className="resume-live-skills">{skills.map((s, i) => <span className="tag blue" key={`${s}-${i}`}>{s}</span>)}</div></section>}{form.experience && <section><h2>Experience</h2><ul>{form.experience.split(/\r?\n/).filter(x => x.trim()).map((x, i) => <li key={i}>{x.replace(/^[-•*]\s*/, "")}</li>)}</ul></section>}{projects.filter(p => p.name.trim()).map(p => <section key={p.id}><h2>{p.name}</h2><p>{p.description}</p><p>{p.stack}</p><div className="action-row">{p.repoUrl && <a href={validWebUrl(p.repoUrl) ? p.repoUrl : undefined} target="_blank" rel="noreferrer">Repository</a>}{p.demoUrl && <a href={validWebUrl(p.demoUrl) ? p.demoUrl : undefined} target="_blank" rel="noreferrer">Live demo</a>}</div></section>)}{form.education && <section><h2>Education</h2><ul>{form.education.split(/\r?\n/).filter(x => x.trim()).map((x, i) => <li key={i}>{x.replace(/^[-•*]\s*/, "")}</li>)}</ul></section>}</div></section>
    </> : <div className="grid grid-2"><section className="panel"><div className="panel-head"><div><div className="eyebrow">Resume intelligence</div><h2>Analyze an existing resume</h2></div><BrainCircuit/></div><label className="upload-drop"><Upload/><b>{fileName || "Choose resume file"}</b><span>PDF, DOCX, TXT · maximum 5 MB</span><input type="file" accept=".pdf,.docx,.txt" onChange={e => extractFile(e.target.files?.[0])}/></label><div className="field" style={{ marginTop: 12 }}><label htmlFor="resume-analysis-target">Target role</label><input id="resume-analysis-target" value={form.role} onChange={e => update("role", e.target.value)}/></div><div className="field" style={{ marginTop: 12 }}><label htmlFor="resume-analysis-text">Resume text (editable)</label><textarea id="resume-analysis-text" rows={12} value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste resume text here…"/></div><label className="consent-check" style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-start" }}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>I understand resume text will be sent to AI service for analysis. I removed personal details I do not want to share.</span></label>{error && <p className="error" role="alert">{error}</p>}<button type="button" className="button primary" style={{ marginTop: 12 }} onClick={analyzeResume} disabled={busy || !resumeText.trim() || !consent}>{busy ? "Analyzing…" : "Analyze resume"}</button><small className="muted" style={{ display: "block", marginTop: 8 }}>Files are extracted in memory, not saved by the extraction endpoint. Scanned PDF OCR is not enabled. Only the first 6,000 characters are analyzed, after consent.</small></section><section className="panel"><div className="panel-head"><div><div className="eyebrow">Analysis</div><h2>Evidence-led suggestions</h2></div><BookOpenCheck/></div>{analysis ? <AIInsight text={analysis} /> : <div className="empty">Strengths, unsupported claims, project depth, gaps and retest suggestions appear here.</div>}</section></div>}
  </div></AppLayout>;
}
