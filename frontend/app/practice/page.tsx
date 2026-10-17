"use client";

import { useEffect, useRef, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { api } from "../../lib/api";
import { runPuter } from "../../lib/ai";
import AIInsight from "../../components/AIInsight";
import { ArrowRight, CheckCircle2, Target, Sparkles, Hammer, RefreshCw, AlertCircle } from "lucide-react";

type CompiledTask = { title: string; statement: string; constraints: string[]; rubric: string[]; competency: string; difficulty: string; context_change: string };
type Evaluation = { score_10: number; criteria: Array<{ label: string; met: boolean; detail: string }>; strengths: string[]; gaps: string[]; next_step: string; reasoning?: string };
function compiledInsightText(evaluation: Evaluation) {
  const unmet = evaluation.criteria.filter((criterion) => !criterion.met);
  return [
    "**Strengths**",
    ...(evaluation.strengths.length ? evaluation.strengths.map((item) => `- ${item}`) : ["- No strengths were identified in the returned evaluation."]),
    "**Missing points**",
    ...(evaluation.gaps.length ? evaluation.gaps.map((item) => `- ${item}`) : ["- No additional gaps were returned."]),
    "**Risks**",
    ...(unmet.length ? unmet.map((item) => `- ${item.label}: ${item.detail}`) : ["- No unmet rubric criteria were returned."]),
    "**Next steps**",
    `- ${evaluation.next_step}`,
    "**Evidence**",
    `- ${evaluation.reasoning || "The model did not provide a separate evidence explanation."}`,
  ].join("\n");
}
function parseObject(raw: string): any {
  const text = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = text.indexOf("{"); const last = text.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("The AI service did not return a structured response. Retry generation.");
  return JSON.parse(text.slice(first, last + 1));
}

export default function Practice() {
  const [challenge, setChallenge] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [compilerMode, setCompilerMode] = useState(false);
  const [skill, setSkill] = useState("");
  const [role, setRole] = useState("Target role");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [task, setTask] = useState<CompiledTask | null>(null);
  const [compiledEvaluation, setCompiledEvaluation] = useState<Evaluation | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const model = "openai/gpt-oss-20b";

  useEffect(() => {
    if (!result) return;
    const frame = window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [result, compiledEvaluation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCompiler = params.get("compiler") === "1";
    const initialSkill = (params.get("skill") || "").slice(0, 120);
    setCompilerMode(isCompiler); setSkill(initialSkill);
    api<any>("/api/v1/career/roles").then(data => { if (data.current_role) setRole(data.current_role); }).catch(() => {});
    if (isCompiler) {
      if (!initialSkill) api<any>("/api/v1/analytics").then(data => setSkill(data.role_progress?.skills?.find((x: any) => x.gap)?.competency || "Role fundamentals")).catch(() => setSkill("Role fundamentals"));
    } else void loadStandard(false);
  }, []);

  async function loadStandard(next = false) {
    setResult(null); setAnswer(""); setError("");
    try { if (next && challenge?.id) setChallenge(await api<any>(`/api/v1/challenges/${challenge.id}/retest`, { method: "POST" })); else setChallenge(await api<any>("/api/v1/challenges/next")); }
    catch (e: any) { setChallenge(null); setError(e?.message || "Standard practice could not be loaded."); }
  }

  async function buildTask() {
    if (!skill.trim()) { setError("Choose the competency you want to practice."); return; }
    setBusy(true); setError(""); setTask(null); setCompiledEvaluation(null); setResult(null); setAnswer("");
    try {
      const prompt = `Create one original hands-on skill practice task for target role ${role}, competency ${skill}, difficulty ${difficulty}. It must use a concrete NEW context, not a memorized textbook question. Do not score the candidate yet. Return ONLY JSON: {"title":"...","statement":"...","constraints":["..."],"rubric":["criterion 1","criterion 2","criterion 3","criterion 4"],"competency":"${skill.replace(/"/g, "")}","difficulty":"${difficulty}","context_change":"Why this task checks transfer into a different situation"}. The learner should be able to answer in text with reasoning, tests, trade-offs and verification. Do not invent facts about the learner.`;
      const data = parseObject(await runPuter(prompt, model));
      if (!String(data.statement || "").trim() || !Array.isArray(data.rubric) || data.rubric.length < 2) throw new Error("The AI service returned an incomplete task. Retry.");
      setTask({ title: String(data.title || `${skill} practice task`), statement: String(data.statement), constraints: Array.isArray(data.constraints) ? data.constraints.map(String).slice(0, 8) : [], rubric: data.rubric.map(String).slice(0, 8), competency: skill, difficulty, context_change: String(data.context_change || "New scenario generated for this practice session") });
    } catch (e: any) { setError(e?.message || "Could not create the practice task. Check the AI service connection."); }
    finally { setBusy(false); }
  }

  async function submitCompiled() {
    if (!task || !answer.trim()) return;
    setBusy(true); setError(""); setCompiledEvaluation(null);
    try {
      const prompt = `Evaluate this learner's response to a generated practice task for target role ${role}, competency ${task.competency}, difficulty ${task.difficulty}. Be specific and fair. Do not infer personality. Treat self-claims as unverified. Use the task rubric: ${JSON.stringify(task.rubric)}. Task: ${task.statement}. Constraints: ${JSON.stringify(task.constraints)}. Learner response: ${answer.slice(0, 9000)}. Return only JSON {"score_10":0,"criteria":[{"label":"criterion","met":false,"detail":"evidence-based explanation"}],"strengths":["..."],"gaps":["..."],"next_step":"...","reasoning":"How the score maps to evidence in the answer"}. score_10 must be a number from 0 through 10. Only claim the transcript showed what is actually present.`;
      const data = parseObject(await runPuter(prompt, model));
      const score10 = Math.max(0, Math.min(10, Number(data.score_10)));
      if (!Number.isFinite(score10) || !Array.isArray(data.criteria)) throw new Error("The evaluation was incomplete. Try submitting again.");
      const evaluation: Evaluation = { score_10: score10, criteria: data.criteria.map((x: any) => ({ label: String(x.label || "Criterion"), met: Boolean(x.met), detail: String(x.detail || "No explanation returned.") })).slice(0, 10), strengths: Array.isArray(data.strengths) ? data.strengths.map(String).slice(0, 8) : [], gaps: Array.isArray(data.gaps) ? data.gaps.map(String).slice(0, 8) : [], next_step: String(data.next_step || "Practice the gap and try a changed context."), reasoning: String(data.reasoning || "") };
      const score = Math.round(score10 * 10); let saved: any = null; let saveMessage = "The result could not be saved to Analytics.";
      try {
        saved = await api<any>("/api/v1/practice/record-result", { method: "POST", body: JSON.stringify({ source: "personalized-practice-compiler", title: task.title, role, competency: task.competency, score, client_scored: true, competency_scores: [{ competency: task.competency, score, answered: 1, total: 1 }] }) });
        saveMessage = saved.notice || "The result was saved as an unverified browser-generated practice signal.";
      } catch (saveError: any) { saveMessage = saveError?.message || saveMessage; }
      setCompiledEvaluation(evaluation); setResult({ score, role_progress: saved?.role_progress, saveMessage });
    } catch (e: any) { setError(e?.message || "Evaluation failed. Your answer remains on screen; retry when ready."); }
    finally { setBusy(false); }
  }

  async function submitStandard() {
    if (!challenge || !answer.trim()) return;
    setBusy(true); setError("");
    try {
      const data = await api<any>(`/api/v1/challenges/${challenge.id}/submit`, { method: "POST", body: JSON.stringify({ answer, provider: "puter", model }) });
      if (data.evaluation?.mode === "puter-client" && data.evaluation?.prompt) data.evaluation.ai_note = await runPuter(data.evaluation.prompt, data.evaluation.model || model);
      setResult(data);
    } catch (e: any) { setError(e?.message || "Could not evaluate this practice answer."); }
    finally { setBusy(false); }
  }

  return <AppLayout><div className="page practice-page practice-flow-page">
    <div className="page-head">
      <div>
        <div className="eyebrow">Practice · evidence and transfer</div>
        <h1>{compilerMode ? "Compile practice for a specific gap." : "Practice the exact gap."}</h1>
        <p>{compilerMode ? "AI creates a fresh applied task for your selected competency and evaluates your response against a clear rubric." : "Work through the prompt, explain your approach, and review the feedback after submission."}</p>
      </div>
      <div className="action-row">
        {compilerMode
          ? <button className="button secondary" type="button" onClick={() => window.location.assign("/practice")}>Standard practice</button>
          : <button className="button" type="button" onClick={() => void loadStandard(true)}>New practice <ArrowRight size={14}/></button>}
      </div>
    </div>
    {error && <div className="notice error" role="alert"><AlertCircle size={16}/>{error}</div>}

    {compilerMode ? <>
      <section className="panel practice-compiler-setup">
        <div className="panel-head"><div><div className="eyebrow">PERSONALIZED PRACTICE</div><h2>Choose what to practice</h2></div><Hammer/></div>
        <div className="grid grid-3">
          <div className="field"><label htmlFor="compiler-role">Target role</label><input id="compiler-role" value={role} onChange={e => setRole(e.target.value)}/></div>
          <div className="field"><label htmlFor="compiler-skill">Competency to practice</label><input id="compiler-skill" value={skill} onChange={e => setSkill(e.target.value)} placeholder="e.g. Testing"/></div>
          <div className="field"><label htmlFor="compiler-difficulty">Difficulty</label><select id="compiler-difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>{["Beginner", "Intermediate", "Advanced", "Expert"].map(x => <option key={x}>{x}</option>)}</select></div>
        </div>
        <button className="button primary" style={{ marginTop: 14 }} type="button" onClick={() => void buildTask()} disabled={busy || !skill.trim()}><Sparkles size={15}/>{busy ? "Creating task…" : "Generate fresh practice task"}</button>
      </section>
      {task && <div className="practice-task-flow">
        <section className="panel practice-question-panel">
          <div className="practice-question-kicker"><span className="eyebrow">PRACTICE QUESTION</span><span className="tag blue">{task.difficulty}</span></div>
          <h2>{task.title}</h2>
          <p className="practice-question-statement">{task.statement}</p>
          <div className="practice-question-meta"><span>{task.competency}</span><span>{role}</span></div>
        </section>
        <section className="panel practice-answer-panel">
          <div className="panel-head"><div><div className="eyebrow">YOUR RESPONSE</div><h2>Write your answer here</h2><p className="muted">Explain your approach in your own words. Include reasoning, trade-offs, tests, and how you would verify the result.</p></div><Target/></div>
          <textarea className="big-textarea" aria-label="Write your practice answer here" value={answer} onChange={e => setAnswer(e.target.value)} rows={8} placeholder="Write your answer here…" />
          <button className="button primary" style={{ marginTop: 12 }} type="button" onClick={() => void submitCompiled()} disabled={busy || !answer.trim()}>{busy ? "Evaluating…" : "Submit answer and view analysis"} <ArrowRight size={14}/></button>
          {compiledEvaluation && result && <div ref={resultRef} tabIndex={-1} className="panel practice-evaluation-result" style={{ marginTop: 18, scrollMarginTop: 92 }}>
            <div className="practice-result-summary"><div><div className="eyebrow">YOUR RESULT</div><h2>Practice analysis</h2></div><div className="result-score">{result.score}%</div></div>
            <div className="muted">{result.saveMessage}</div>
            {result.role_progress && <div className="practice-role-progress"><div><b>Role progress</b><strong>{result.role_progress.score ?? "—"}%</strong></div><div className="practice-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, Number(result.role_progress.score) || 0))}%` }}/></div><small>{result.role_progress.gap_count ?? 0} open skill gaps · formative practice signal, not independently verified evidence</small></div>}
            <AIInsight text={compiledInsightText(compiledEvaluation)} compact visualFlow />
            <p className="muted">This AI-generated score is formative feedback, not independently verified evidence of mastery.</p>
            <button className="button" type="button" onClick={() => window.location.assign("/analytics")}>Review Analytics <ArrowRight size={14}/></button>
          </div>}
        </section>
      </div>}
    </> : !challenge ? <div className="empty">{error ? "Practice could not be loaded." : "Loading practice…"}</div> : <div className="practice-task-flow">
      <section className="panel practice-question-panel">
        <div className="practice-question-kicker"><span className="eyebrow">PRACTICE QUESTION</span><span className="tag blue">Role-aligned</span></div>
        <h2>{challenge.title}</h2>
        <p className="practice-question-statement">{challenge.statement}</p>
      </section>
      <section className="panel practice-answer-panel">
        <div className="panel-head"><div><div className="eyebrow">YOUR RESPONSE</div><h2>Write your answer here</h2><p className="muted">Explain the steps you would take and why.</p></div><Target/></div>
        <textarea className="big-textarea" aria-label="Write your practice answer here" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your answer here…" rows={8}/>
        <button className="button primary" style={{ marginTop: 12 }} type="button" onClick={() => void submitStandard()} disabled={busy || !answer.trim()}>{busy ? "Analyzing…" : "Submit answer and view analysis"} <ArrowRight size={14}/></button>
        {result && <div ref={resultRef} tabIndex={-1} className="panel practice-evaluation-result" style={{ marginTop: 18, scrollMarginTop: 92 }}>
          <div className="practice-result-summary"><div><div className="eyebrow">YOUR RESULT</div><h2>Practice analysis</h2></div><div className="result-score">{result.score}%</div></div>
          {result.role_progress && <div className="grid grid-3 practice-progress-metrics" style={{ margin: "10px 0" }}>
            <div className="signal"><b>Target role signal</b><span>{result.role_progress.score == null ? "—" : `${result.role_progress.score}%`}</span></div>
            <div className="signal"><b>Assessment coverage</b><span>{result.role_progress.assessment_covered_skill_count || 0}/{result.role_progress.required_skill_count} · {result.role_progress.assessment_coverage_percent}%</span></div>
            <div className="signal"><b>Gaps / evidence</b><span>{result.role_progress.gap_count} gaps · {result.role_progress.evidence_covered_skill_count} skills with evidence</span></div>
          </div>}
          <p className="muted">Practice scores are rubric signals and are not independent proof of skill.</p>
          {result.evaluation?.criteria?.length > 0 && <div className="practice-criteria-map" aria-label="Evaluation criteria">{result.evaluation.criteria.map((x: any, i: number) => <article className={`practice-criteria-item ${x.met ? "good" : "warn"}`} key={i}><span className="practice-criteria-mark">{x.met ? "✓" : "•"}</span><div><b>{x.label}</b><p>{x.detail}</p></div></article>)}</div>}
          {result.evaluation?.ai_note && <AIInsight text={result.evaluation.ai_note} compact visualFlow />}
          <p><b>Next step:</b> {result.evaluation?.next_step}</p>
        </div>}
      </section>
    </div>}
  </div></AppLayout>;

}
