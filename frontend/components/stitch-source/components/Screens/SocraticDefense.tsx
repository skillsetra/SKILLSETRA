"use client";
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, MessageSquare, Copy, Check, RotateCw, BrainCircuit } from 'lucide-react';
import type { ScreenId } from '../../types';
import { api } from '../../../../lib/api';
import { runPuter } from '../../../../lib/ai';
import AIInsight from '../../../AIInsight';

type DefenseData = { project_id?: string; questions: string[]; [key: string]: any };

export const SocraticDefense: React.FC<{ onNavigate: (s: ScreenId) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<DefenseData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const questionRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const model = 'openai/gpt-oss-20b';

  useEffect(() => {
    let active = true;
    setLoadingQuestions(true);
    setLoadError('');
    setData(null);
    setIndex(0);
    setAnswer('');
    setResult(null);
    api<DefenseData>('/api/v1/project-defense').then(async response => {
      if (!active) return;
      if (!Array.isArray(response?.questions) || response.questions.length === 0) {
        throw new Error('No project-defense questions are available yet. Retry to request a fresh question set.');
      }
      // Generate a fresh question set with Puter AI. Keep the server-provided set as
      // a reliable fallback if AI is temporarily unavailable.
      try {
        const generated = await runPuter('Create 5 distinct technical project-defense questions for a software project. Focus on architecture choices, alternatives and trade-offs, testing, security, reliability, and scale. Do not assume a particular stack or invent project details. Return ONLY valid JSON in this exact shape: {"questions":["question 1","question 2","question 3","question 4","question 5"]}.', model);
        const clean = generated.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(clean);
        const questions = Array.isArray(parsed?.questions) ? parsed.questions.filter((q: unknown) => typeof q === 'string' && q.trim()).slice(0, 5) : [];
        if (questions.length >= 3) response.questions = questions;
      } catch { /* Keep the server-provided questions and let the user continue. */ }
      if (active) setData(response);
    }).catch((error: any) => {
      if (!active) return;
      setLoadError(error?.message || 'The project-defense service could not be reached.');
    }).finally(() => { if (active) setLoadingQuestions(false); });
    return () => { active = false; };
  }, [retryKey]);

  useEffect(() => {
    if (!result) return;
    const frame = window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [result]);

  useEffect(() => {
    if (!data || loadingQuestions || result) return;
    const frame = window.requestAnimationFrame(() => questionRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [data, index, loadingQuestions, result]);

  async function submit() {
    const question = data?.questions?.[index];
    if (!data || !question || !answer.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await api<any>('/api/v1/project-defense', {
        method: 'POST',
        body: JSON.stringify({ project_id: data.project_id, question, answer, provider: 'puter', model, language: 'English' }),
      });
      let output: any = response;
      if (response.mode === 'puter-client' && response.prompt) {
        const text = await runPuter(response.prompt, response.model || model);
        output = { ...response, ai_note: text, mode: 'live' };
      }
      setResult(output);
      setAnswer('');
    } catch (error: any) {
      setResult({ status: 'Evaluation unavailable', observed: error?.message || 'The project defense service could not be reached.' });
    } finally {
      setLoading(false);
    }
  }

  function nextQuestion() {
    if (!data || index >= data.questions.length - 1) return;
    setIndex(current => Math.min(current + 1, data.questions.length - 1));
    setResult(null);
    setAnswer('');
  }

  async function copyResult() {
    const text = result?.ai_note || result?.observed || result?.status || '';
    try {
      if (text && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch { setCopied(false); }
  }

  const question = data?.questions?.[index] || '';
  const answerProgress = data?.questions?.length ? `${index + 1} of ${data.questions.length}` : '—';

  return <div className="page project-defense-flow-page">
    <div className="page-head"><div><div className="eyebrow">PROJECT DEFENSE</div><h1>Defend the decisions behind what you built.</h1><p>Explain the choices behind your project, identify trade-offs, and show how you would verify the result.</p></div><button className="button" type="button" onClick={() => onNavigate('project-upgrade')}>Back to project <ArrowRight size={15} /></button></div>

    {loadingQuestions ? <section className="panel challenge-loading-state" role="status" aria-live="polite"><div className="challenge-loading-mark" aria-hidden="true"><span /><span /><span /></div><h2>Preparing your defense question</h2><p className="muted">Getting the project context for this session.</p></section> : !data ? <section className="panel defense-load-error" role="alert"><h2>Project defense unavailable</h2><p>{loadError || 'The question set could not be loaded.'}</p><button className="button primary" type="button" onClick={() => setRetryKey(value => value + 1)}><RotateCw size={14} /> Retry questions</button></section> : <>
      <section ref={questionRef} className="panel project-defense-question-panel" style={{ scrollMarginTop: 92 }}>
        <div className="project-defense-question-kicker"><span>PROJECT DEFENSE</span><span>Question {answerProgress}</span></div>
        <h2 className="project-defense-question-text">{question}</h2>
        <div className="project-defense-answer-area">
          <label htmlFor="project-defense-answer">Write your answer here</label>
          <p className="muted">Explain why you chose this approach, which alternatives you considered, the trade-offs, and how you would test your decision.</p>
          <textarea id="project-defense-answer" className="big-textarea" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Explain the decision, alternative, trade-off, and verification plan…" rows={7} />
          <div className="challenge-submit-row"><span className="muted">There may be more than one valid design. Support your reasoning with evidence.</span><button className="button primary" type="button" disabled={loading || !answer.trim()} onClick={() => void submit()}>{loading ? 'Evaluating your defense…' : 'Submit answer'} <ArrowRight size={14} /></button></div>
        </div>
      </section>

      <section className="panel project-defense-analysis-panel" aria-live="polite">
        <div className="panel-head"><div><div className="eyebrow">YOUR RESULT</div><h2>Defense analysis</h2><p className="muted">Your reasoning feedback appears here automatically after submission.</p></div><BrainCircuit /></div>
        {!result ? <div className="challenge-result-placeholder"><div className="challenge-analysis-steps"><span>01 · Decision</span><i /><span>02 · Alternatives</span><i /><span>03 · Trade-offs</span><i /><span>04 · Verification</span></div><p>Your evaluation will appear here when your answer is submitted.</p></div> : <div ref={resultRef} tabIndex={-1} className="project-defense-result-content" style={{ scrollMarginTop: 92 }}>
          <div className="challenge-result-summary"><div><span className="eyebrow">SKILLSETRA AI evaluation</span><h3>{result.status || 'Evaluation complete'}</h3></div>{result.score != null && <div className="challenge-result-score"><small>Result score</small><strong>{Number(result.score)}%</strong></div>}</div>
          {result.role_progress && <div className="reasoning-progress-map" aria-label="Target role progress summary"><article><small>Target role progress</small><strong>{result.role_progress.score == null ? '—' : `${result.role_progress.score}%`}</strong><div className="reasoning-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, Number(result.role_progress.score) || 0))}%` }} /></div></article><article><small>Assessment coverage</small><strong>{result.role_progress.assessment_coverage_percent || 0}%</strong><span>{result.role_progress.assessment_covered_skill_count || 0}/{result.role_progress.required_skill_count || 0} required skills</span></article><article><small>Evidence and gaps</small><strong>{result.role_progress.gap_count || 0} gaps</strong><span>{result.role_progress.evidence_covered_skill_count || 0} skills with evidence</span></article></div>}
          <div className="answer-toolbar"><button className="button" type="button" onClick={() => void copyResult()}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy result'}</button></div>
          {result.observed && <p><b>Observed:</b> {String(result.observed)}</p>}
          {result.ai_note && <AIInsight text={result.ai_note} visualFlow />}
          {result.next_step && <p><b>Next step:</b> {String(result.next_step)}</p>}
          <p className="muted">AI feedback is a practice signal. It does not independently verify project ownership or mastery.</p>
          {index < data.questions.length - 1 && <div className="challenge-submit-row"><span className="muted">Continue to a new question to test your reasoning in a different context.</span><button className="button primary" type="button" onClick={nextQuestion}>Next question <ArrowRight size={14} /></button></div>}
        </div>}
      </section>
    </>}
  </div>;
};
