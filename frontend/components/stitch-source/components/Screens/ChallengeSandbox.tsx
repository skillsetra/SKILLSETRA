"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, Check, Target, RotateCw } from 'lucide-react';
import type { ScreenId } from '../../types';
import { api } from '../../../../lib/api';
import { runPuter } from '../../../../lib/ai';
import AIInsight from '../../../AIInsight';
import { cleanAIText } from '../../../../lib/ai-insight.mjs';

type Challenge = {
  id: string;
  title: string;
  statement: string;
  constraints: string[];
  starter_code?: string;
  variant?: string;
};

export const ChallengeSandbox: React.FC<{ onNavigate: (s: ScreenId) => void }> = ({ onNavigate }) => {
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
      const next = await api<Challenge>('/api/v1/challenges/next');
      if (!next?.id || !String(next.title || '').trim() || !String(next.statement || '').trim()) {
        throw new Error('The challenge service returned an incomplete prompt. Please retry.');
      }
      setChallenge(next);
    } catch (error: any) {
      setChallengeError(error?.message || 'Challenge service is unavailable.');
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
      const response = await api<any>(`/api/v1/challenges/${encodeURIComponent(challenge.id)}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answer, language: 'English', provider, model }),
      });
      let output: any = response;
      if (response.evaluation?.mode === 'puter-client' && response.evaluation?.prompt) {
        const text = await runPuter(response.evaluation.prompt, response.evaluation.model || model);
        output = { ...response, evaluation: { ...response.evaluation, ai_note: text, mode: 'live' } };
      }
      setResult(output);
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
        {loadingChallenge ? <><div className="challenge-loading-mark" aria-hidden="true"><span /><span /><span /></div><h2>Preparing your challenge</h2><p className="muted">Getting the next role-relevant scenario ready.</p></> : <><h2>Challenge unavailable</h2><p>{challengeError || 'A challenge could not be loaded.'}</p><button className="button primary" type="button" onClick={() => void loadChallenge()}><RotateCw size={14} /> Retry challenge</button></>}
      </section>
    </div>;
  }

  const evaluation = result?.evaluation || {};
  const criteria = Array.isArray(evaluation.criteria) ? evaluation.criteria : [];
  const score = result?.score != null && Number.isFinite(Number(result.score)) ? Number(result.score) : null;

  return <div className="page challenge-flow-page">
    <div className="page-head">
      <div><div className="eyebrow">CHALLENGE LAB · {challenge.variant || 'ADAPTIVE'}</div><h1>Solve the challenge. Prove the fix.</h1><p>Focus on the prompt, explain your approach, and verify how you would know the solution works.</p></div>
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
