"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, Check, Target, RotateCw } from 'lucide-react';
import type { ScreenId } from '../../types';
import { api } from '../../../../lib/api';
import { useApp } from '../../../AppProvider';
import { runPuter } from '../../../../lib/ai';
import AIInsight from '../../../AIInsight';
import { cleanAIText } from '../../../../lib/ai-insight.mjs';

type Challenge = {
  id: string;
  aiGenerated?: boolean;
  competency?: string;
  title: string;
  statement: string;
  constraints: string[];
  starter_code?: string;
  variant?: string;
};

export const ChallengeSandbox: React.FC<{ onNavigate: (s: ScreenId) => void }> = ({ onNavigate }) => {
  const { user } = useApp();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeError, setChallengeError] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const provider = 'puter';
  const model = 'openai/gpt-oss-20b';

  const loadChallenge = useCallback(async () => {
    setLoadingChallenge(true);
    setChallengeError('');
    setChallenge(null);
    setResult(null);
    setAnswer('');
    try {
      const raw = await runPuter(`Generate one original, practical technical challenge for target role ${user?.targetRole || "the learner's chosen technical role"}. It must be a new scenario, not a memorized question. Focus on implementation/debugging, edge cases, tests, and verification. Return ONLY valid JSON: {"title":"short title","statement":"clear challenge in 2-5 sentences","constraints":["constraint"],"starter_code":"optional tiny context or empty string","competency":"one skill name"}. Do not include a solution or answer key.`, model);
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
      if (!String(parsed.title || '').trim() || !String(parsed.statement || '').trim()) throw new Error('The AI returned an incomplete challenge. Retry generation.');
      setChallenge({ id: `ai-generated-${Date.now()}`, aiGenerated: true, title: String(parsed.title).slice(0, 180), statement: String(parsed.statement).slice(0, 5000), constraints: Array.isArray(parsed.constraints) ? parsed.constraints.map(String).slice(0, 8) : [], starter_code: String(parsed.starter_code || '').slice(0, 4000), competency: String(parsed.competency || 'Role fundamentals'), variant: 'AI GENERATED' });
    } catch (error: any) {
      setChallengeError(error?.message || 'AI challenge generation is unavailable. Retry after checking your connection.');
    } finally {
      setLoadingChallenge(false);
    }
  }, []);

  useEffect(() => { void loadChallenge(); }, [loadChallenge]);

  useEffect(() => {
    if (!result) return;
    const frame = window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [result]);

  async function submit() {
    if (!challenge || !answer.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      if (challenge.aiGenerated) {
        const prompt = `Evaluate the learner's answer to this AI-generated challenge for the target role. Challenge: ${challenge.title}. Statement: ${challenge.statement}. Constraints: ${JSON.stringify(challenge.constraints || [])}. Competency: ${challenge.competency || 'Role fundamentals'}. Learner answer: ${answer.slice(0, 9000)}. Evaluate only what is present; do not infer unshown work. Return ONLY JSON: {"score":0,"status":"Evaluation complete","strengths":["..."],"gaps":["..."],"criteria":[{"label":"criterion","met":false,"detail":"evidence from answer"}],"ai_note":"clear feedback","next_step":"..."}. Score is 0-100.`;
        const raw = await runPuter(prompt, model);
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const data = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
        const score = Math.max(0, Math.min(100, Number(data.score) || 0));
        let roleProgress: any = null;
        try { const saved = await api<any>('/api/v1/practice/record-result', { method: 'POST', body: JSON.stringify({ source: 'ai-generated-challenge', title: challenge.title, competency: challenge.competency || 'Role fundamentals', score, client_scored: true, competency_scores: [{ competency: challenge.competency || 'Role fundamentals', score, answered: 1, total: 1 }] }) }); roleProgress = saved?.role_progress || null; } catch { /* Evaluation remains available if progress recording is temporarily offline. */ }
        setResult({ ...data, score, role_progress: roleProgress, evaluation: { ...data, ai_note: String(data.ai_note || ''), criteria: Array.isArray(data.criteria) ? data.criteria : [], strengths: Array.isArray(data.strengths) ? data.strengths : [], gaps: Array.isArray(data.gaps) ? data.gaps : [] } });
      } else {
        const response = await api<any>(`/api/v1/challenges/${encodeURIComponent(challenge.id)}/submit`, { method: 'POST', body: JSON.stringify({ answer, language: 'English', provider, model }) });
        let output: any = response;
        if (response.evaluation?.mode === 'puter-client' && response.evaluation?.prompt) {
          const text = await runPuter(response.evaluation.prompt, response.evaluation.model || model);
          output = { ...response, evaluation: { ...response.evaluation, ai_note: text, mode: 'live' } };
        }
        setResult(output);
      }
    } catch (error: any) {
      setResult({
        status: 'Evaluation unavailable',
        evaluation: { uncertain: error?.message || 'The AI service could not evaluate this response.' },
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    const text = result?.evaluation?.ai_note || result?.evaluation?.observed || result?.evaluation?.uncertain || '';
    try {
      if (text && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  if (loadingChallenge || !challenge) {
    return <div className="page challenge-flow-page">
      <div className="page-head"><div><div className="eyebrow">Challenge Lab</div><h1>Solve the challenge. Prove the fix.</h1><p>Work through a focused scenario, explain your reasoning, and inspect the evaluation.</p></div></div>
      <section className="panel challenge-loading-state" role={challengeError ? 'alert' : 'status'} aria-live="polite">
        {loadingChallenge ? <><div className="challenge-loading-mark" aria-hidden="true"><span /><span /><span /></div><h2>Preparing your challenge</h2><p className="muted">AI is creating a fresh role-relevant scenario. No built-in question bank is used.</p></> : <><h2>AI challenge unavailable</h2><p>{challengeError || 'An AI-generated challenge could not be loaded.'}</p><button className="button primary" type="button" onClick={() => void loadChallenge()}><RotateCw size={14} /> Retry AI generation</button></>}
      </section>
    </div>;
  }

  const evaluation = result?.evaluation || {};
  const criteria = Array.isArray(evaluation.criteria) ? evaluation.criteria : [];
  const score = result?.score != null && Number.isFinite(Number(result.score)) ? Number(result.score) : null;

  return <div className="page challenge-flow-page">
    <div className="page-head">
      <div><div className="eyebrow">CHALLENGE LAB · AI GENERATED</div><h1>Solve the challenge. Prove the fix.</h1><p>Focus on the prompt, explain your approach, and verify how you would know the solution works.</p></div>
      <button className="button" type="button" onClick={() => onNavigate('diagnostic')}>Assess first <ArrowRight size={15} /></button>
    </div>

    <section className="panel challenge-question-panel">
      <div className="challenge-question-kicker"><span>THE CHALLENGE</span><span>Role-aware practice</span></div>
      <h2 className="challenge-question-title">{challenge.title}</h2>
      <p className="challenge-question-text">{challenge.statement}</p>
      {challenge.starter_code && <details className="challenge-starter-context">
        <summary>View starter context</summary>
        <pre>{challenge.starter_code}</pre>
      </details>}
      <div className="challenge-answer-area">
        <label htmlFor="challenge-answer">Write your answer here</label>
        <p className="muted">Describe your solution, edge cases, failure handling, tests, and how you would verify the result.</p>
        <textarea id="challenge-answer" className="big-textarea" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Explain the fix and why it works. Include tests, trade-offs, and verification steps…" rows={7} />
        <div className="challenge-submit-row"><span className="muted">The challenge-specific evaluation criteria stay internal to the evaluator.</span><button className="button primary" type="button" disabled={loading || !answer.trim()} onClick={() => void submit()}>{loading ? 'Evaluating your answer…' : 'Submit answer'} <ArrowRight size={14} /></button></div>
      </div>
    </section>

    <section className="panel challenge-analysis-panel" aria-live="polite">
      <div className="panel-head"><div><div className="eyebrow">YOUR RESULT</div><h2>Challenge analysis</h2><p className="muted">Your score, what the response demonstrated, and the next best verification step appear here after submission.</p></div><Target /></div>
      {!result ? <div className="challenge-result-placeholder"><div className="challenge-analysis-steps"><span>01 · Approach</span><i /><span>02 · Edge cases</span><i /><span>03 · Tests</span><i /><span>04 · Verification</span></div><p>Your analysis will appear here automatically after you submit your answer.</p></div> : <div ref={resultRef} tabIndex={-1} className="challenge-result-content" style={{ scrollMarginTop: 92 }}>
        <div className="challenge-result-summary"><div><span className="eyebrow">EVALUATION STATUS</span><h3>{result.status || 'Evaluation complete'}</h3></div><div className="challenge-result-score"><small>Challenge score</small><strong>{score === null ? '—' : `${score}%`}</strong></div></div>
        {result.role_progress && <div className="reasoning-progress-map" aria-label="Target role progress summary">
          <article><small>Target role progress</small><strong>{result.role_progress.score == null ? '—' : `${result.role_progress.score}%`}</strong><div className="reasoning-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, Number(result.role_progress.score) || 0))}%` }} /></div></article>
          <article><small>Assessment coverage</small><strong>{result.role_progress.assessment_coverage_percent || 0}%</strong><span>{result.role_progress.assessment_covered_skill_count || 0}/{result.role_progress.required_skill_count || 0} required skills</span></article>
          <article><small>Evidence and gaps</small><strong>{result.role_progress.gap_count || 0} gaps</strong><span>{result.role_progress.evidence_covered_skill_count || 0} skills with evidence</span></article>
        </div>}
        {criteria.length > 0 && <div className="challenge-criteria-map">{criteria.map((item: any, index: number) => <article className={`challenge-criteria-item ${item.met ? 'good' : 'warn'}`} key={`${item.label || 'criterion'}-${index}`}><span className="challenge-criteria-mark">{item.met ? <CheckCircle2 size={15} /> : index + 1}</span><div><b>{cleanAIText(item.label || `Criterion ${index + 1}`)}</b><p>{cleanAIText(item.detail || (item.met ? 'Evidence was observed for this criterion.' : 'This criterion needs clearer evidence.'))}</p></div></article>)}</div>}
        <div className="answer-toolbar"><button className="button" type="button" onClick={() => void copyResult()}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy result'}</button></div>
        {evaluation.observed && <p><b>Observed:</b> {cleanAIText(evaluation.observed)}</p>}
        {evaluation.uncertain && <p><b>Missing or uncertain:</b> {cleanAIText(evaluation.uncertain)}</p>}
        {evaluation.ai_note && <AIInsight text={evaluation.ai_note} visualFlow />}
        {evaluation.provider_unavailable && <p className="notice" role="status">AI assistance was unavailable. The displayed result is rubric-based only.</p>}
        {evaluation.next_step && <p><b>Next step:</b> {cleanAIText(evaluation.next_step)}</p>}
        <p className="muted">A practice evaluation is a performance signal, not independent proof of mastery.</p>
      </div>}
    </section>
  </div>;
};
