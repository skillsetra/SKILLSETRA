"use client";
import { useEffect, useRef, useState } from "react";
import AppLayout from "../../components/AppLayout";
import AIInsight from "../../components/AIInsight";
import { api } from "../../lib/api";
import { runPuter } from "../../lib/ai";
import { Brain, ArrowRight, RotateCcw, Copy, Check, ClipboardCheck } from "lucide-react";

export default function Reasoning() {
  const analysisRef = useRef<HTMLDivElement | null>(null);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  const [problem, setProblem] = useState("A production API becomes slow only when traffic spikes. CPU is moderate, database connections are near their limit, and retry traffic increases during timeouts. Explain the most likely causal chain and how you would verify it.");
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [progress, setProgress] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const model = "openai/gpt-oss-20b";
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!analysis) return;
    const frame = window.requestAnimationFrame(() => analysisRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [analysis]);

  async function go() {
    if (!answer.trim() || busy) return;
    setBusy(true);
    setError("");
    setAnalysis("");
    setProgress(null);
    try {
      const response = await api<any>("/api/v1/reasoning/analyze", {
        method: "POST",
        body: JSON.stringify({ problem, answer, provider: "puter", model, language: "English" }),
      });
      setProgress(response.role_progress || null);
      const generated = response.mode === "puter-client"
        ? await runPuter(response.prompt, response.model || model)
        : (response.analysis || response.notice || "");
      setAnalysis(String(generated || "The analysis service returned no readable result. Please retry after checking the AI service connection."));
    } catch (reason: any) {
      setError(reason?.message || "Reasoning analysis could not be completed.");
      setAnalysis(reason?.message || "Reasoning analysis could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard?.writeText(analysis);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Copy was blocked by the browser. Select the result text and copy it manually.");
    }
  }

  function reset() {
    setAnswer("");
    setAnalysis("");
    setProgress(null);
    setError("");
    setCopied(false);
    window.requestAnimationFrame(() => answerRef.current?.focus());
  }

  return <AppLayout><div className="page reasoning-page reasoning-flow-page">
    <div className="page-head">
      <div><div className="eyebrow">Reasoning Lab</div><h1>Make the thinking inspectable.</h1><p>Practice assumptions, causality, alternative explanations, trade-offs and verification — not just final answers.</p></div>
      <button className="button" type="button" onClick={reset}><RotateCcw size={14}/> Reset</button>
    </div>

    <section className="panel reasoning-question-panel">
      <div className="panel-head"><div><div className="eyebrow">THE CASE</div><h2>Reasoning challenge</h2></div><Brain/></div>
      <p className="reasoning-question-text">{problem}</p>
      <div className="reasoning-answer-area">
        <label htmlFor="reasoning-answer">Write your answer here</label>
        <textarea ref={answerRef} id="reasoning-answer" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Explain your assumptions, likely cause, evidence, alternatives, and how you would verify the explanation…" rows={7} />
        {error && !analysis && <p className="notice error" role="alert">{error}</p>}
        <div className="reasoning-submit-row"><span className="muted">Use specific evidence and explain how you would test the cause.</span><button className="button primary" type="button" onClick={() => void go()} disabled={busy || !answer.trim()}>{busy ? "Analyzing…" : "Analyze my answer"} <ArrowRight size={14}/></button></div>
      </div>
    </section>

    <section ref={analysisRef} tabIndex={-1} className="panel reasoning-analysis-panel" style={{ scrollMarginTop: 92, outline: "none" }} aria-live="polite">
      <div className="panel-head"><div><div className="eyebrow">YOUR RESULT</div><h2>Reasoning analysis</h2><p className="muted">Findings, gaps and next verification steps in a visual map.</p></div><ClipboardCheck/></div>
      {analysis ? <>
        {progress && <div className="reasoning-progress-map" aria-label="Role progress summary">
          <article><small>Target role progress</small><strong>{progress.score == null ? "—" : `${progress.score}%`}</strong><div className="reasoning-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, Number(progress.score) || 0))}%` }}/></div></article>
          <article><small>Assessment coverage</small><strong>{progress.assessment_coverage_percent || 0}%</strong><span>{progress.assessment_covered_skill_count || 0}/{progress.required_skill_count || 0} required skills</span></article>
          <article><small>Evidence and gaps</small><strong>{progress.gap_count || 0} gaps</strong><span>{progress.evidence_covered_skill_count || 0} skills with evidence</span></article>
        </div>}
        <div className="answer-toolbar"><button className="button" type="button" onClick={() => void copy()}>{copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? "Copied" : "Copy analysis"}</button></div>
        <AIInsight text={analysis} visualFlow />
      </> : <div className="reasoning-empty-map"><div className="reasoning-empty-steps"><span>01 · Assumptions</span><i/><span>02 · Cause</span><i/><span>03 · Evidence</span><i/><span>04 · Verification</span></div><p>Your analysis will appear here automatically after you submit your answer.</p></div>}
    </section>
  </div></AppLayout>;
}
