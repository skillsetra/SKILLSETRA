"use client";
import React,{useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,XCircle,Sparkles,RefreshCw,MessageCircleQuestion,Target,BrainCircuit,FileCheck2,BarChart3} from 'lucide-react';
import type {ScreenId} from '../../types';
import {useApp} from '../../../AppProvider';
import {api} from '../../../../lib/api';
import {runPuter} from '../../../../lib/ai';
import {scrollToElement} from '../../../../lib/scroll';

type Q={id:string;competency:string;difficulty:string;question:string;options:string[];correct?:number;explanation?:string};
type Result={score:number;correct:number;total:number;passed:boolean;details:any[];summary:string;source?:string;role_progress?:any;progress_saved?:boolean;previous_score?:number|null;change?:number|null};

function parseAIQuestions(raw:string,role:string,minimum=3):Q[]{
  const text=(raw||'').trim();
  const candidates=[text.replace(/```json/gi,'').replace(/```/g,'').trim()];
  const objMatch=text.match(/\{[\s\S]*\}/); if(objMatch)candidates.push(objMatch[0]);
  const arrMatch=text.match(/\[[\s\S]*\]/); if(arrMatch)candidates.push(arrMatch[0]);
  for(const candidate of candidates){
    try{
      const parsed=JSON.parse(candidate); const list=Array.isArray(parsed)?parsed:parsed.questions;
      if(!Array.isArray(list))continue;
      const out:Q[]=[];
      for(let i=0;i<list.length;i++){
        const x=list[i]; if(!x||!Array.isArray(x.options)||x.options.length!==4||typeof x.question!=='string')continue;
        const correct=Number(x.correct); if(!Number.isInteger(correct)||correct<0||correct>3)continue;
        out.push({id:`browser-ai-${i+1}`,competency:String(x.competency||'Role fundamentals').slice(0,120),difficulty:String(x.difficulty||'Intermediate'),question:x.question.trim(),options:x.options.map((v:any)=>String(v)),correct,explanation:String(x.explanation||'')});
      }
      if(out.length>=minimum)return out;
    }catch{}
  }
  throw new Error(`The AI service did not return a valid question set for ${role}.`);
}

export const DiagnosticAssessment:React.FC<{onNavigate:(s:ScreenId)=>void}>=({onNavigate})=>{
 const {user}=useApp();
 const[d,setD]=useState<any>();const[reloadKey,setReloadKey]=useState(0);const[i,setI]=useState(0);const[answers,setAnswers]=useState<Record<string,string>>({});const[result,setResult]=useState<Result|null>();const[loading,setLoading]=useState(true);
 const provider='puter';const[submitting,setSubmitting]=useState(false);const model='openai/gpt-oss-20b';const[aiQ,setAiQ]=useState<Q|null>(null);const[aiLoading,setAiLoading]=useState(false);const[aiAnswer,setAiAnswer]=useState<string|null>(null);const[aiError,setAiError]=useState('');const[blindTransfer,setBlindTransfer]=useState(false);const[blindSkill,setBlindSkill]=useState('');const resultRef=React.useRef<HTMLDivElement|null>(null);const aiQuestionRef=React.useRef<HTMLElement|null>(null);const advanceTimerRef=React.useRef<number|null>(null);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const blind=params.get('mode')==='blind-transfer';const requestedSkill=(params.get('skill')||'').slice(0,120);if(blind){setBlindTransfer(true);setBlindSkill(requestedSkill)}setLoading(true);setD(undefined);setI(0);setAnswers({});setResult(null);void generateAISet();},[user?.targetRole,reloadKey]);
 const questions:Q[]=d?.questions||[];
 const role=user?.targetRole||d?.role||new URLSearchParams(typeof window==='undefined'?'':window.location.search).get('role')||'Target role';
 // Provider and model are fixed internally; do not mutate a nonexistent provider selector.
 const currentQuestionRef=React.useRef<HTMLElement|null>(null);
 const answeredCount=questions.filter(q=>answers[q.id]!==undefined).length;
 useEffect(()=>{
   if(loading||!questions.length)return;
   const frame=window.requestAnimationFrame(()=>scrollToElement(currentQuestionRef.current||document.getElementById('assessment-current-question'),{extra:20}));
   return()=>window.cancelAnimationFrame(frame);
 },[loading,d?.id,i,questions.length,role]);
 useEffect(()=>{if(aiQ)scrollToElement(aiQuestionRef.current,{extra:20})},[aiQ]);
 useEffect(()=>{if(result)scrollToElement(resultRef.current,{extra:20})},[result]);
 useEffect(()=>()=>{if(advanceTimerRef.current!==null)window.clearTimeout(advanceTimerRef.current)},[]);
 function chooseAnswer(questionId:string,index:number,questionPosition:number){
   if(advanceTimerRef.current!==null){window.clearTimeout(advanceTimerRef.current);advanceTimerRef.current=null;}
   setAnswers(a=>({...a,[questionId]:String(index)}));
   setI(questionPosition);
   // Keep the green selection visible briefly, then scroll to the next stacked card.
   if(questionPosition<questions.length-1)advanceTimerRef.current=window.setTimeout(()=>{setI(questionPosition+1);advanceTimerRef.current=null},500);
 }
 function moveToQuestion(next:number){
   if(advanceTimerRef.current!==null){window.clearTimeout(advanceTimerRef.current);advanceTimerRef.current=null;}
   setI(Math.max(0,Math.min(next,questions.length-1)));
 }
 async function loadAI(){
   setAiLoading(true);setAiError('');setAiQ(null);setAiAnswer(null);
   try{
     const r=await api<any>('/api/v1/assessment/ask-question',{method:'POST',body:JSON.stringify({role,provider,model,language:'English'})});
     if(r.mode==='puter-client'){const raw=await runPuter(r.prompt,r.model||model);setAiQ(parseAIQuestions(raw,role,1)[0]);}
     else setAiQ(r.question);
   }catch(e:any){setAiError(e.message||'AI question generation failed.');}
   finally{setAiLoading(false)}
 }
 async function generateAISet(){
   setAiLoading(true);setAiError('');setResult(null);
   try{
     const r=await api<any>('/api/v1/assessment/generate',{method:'POST',body:JSON.stringify({role,provider,model,language:'English',count:8,competency:blindSkill,blind_transfer:blindTransfer})});
     let generated:Q[];
     if(r.mode==='puter-client'){const raw=await runPuter(r.prompt,r.model||model);generated=parseAIQuestions(raw,role).slice(0,8);setD({id:r.assessment_id,title:blindTransfer?`${role} blind-transfer retest · ${blindSkill||'role skills'}`:`${role} AI practice assessment`,role,source:blindTransfer?'ai-browser-blind-transfer':'ai-browser',blind_transfer:blindTransfer,competency:blindSkill,question_count:generated.length,questions:generated});}
     else {generated=r.questions;setD({...r,id:r.assessment_id,title:r.title||(blindTransfer?`${role} blind-transfer retest · ${blindSkill||'role skills'}`:`${role} AI practice assessment`),source:blindTransfer?'blind-transfer-server':'ai-server',blind_transfer:blindTransfer,competency:blindSkill});}
     setI(0);setAnswers({});setAiQ(null);setAiError('');window.setTimeout(()=>scrollToElement(currentQuestionRef.current||document.getElementById('assessment-current-question'),{extra:20}),90);
   }catch(e:any){setAiError(e.message||'AI assessment generation failed. Retry to generate a fresh AI question set.');setD(null)}
   finally{setAiLoading(false);setLoading(false)}
 }
 async function submit(){
   if(submitting)return;
   if(questions.some(q=>answers[q.id]===undefined)){setAiError("Answer every assessment question before submitting.");return;}
   setSubmitting(true);setAiError("");
   try{
     const assessmentId=d?.id||'adaptive-v1';
     if(String(d?.source||'').startsWith('ai-browser')){
       const details=questions.map(q=>{const selected=Number(answers[q.id]??-1);const ok=selected===q.correct;return {question_id:q.id,competency:q.competency,selected,correct:q.correct,is_correct:ok,answered:selected>=0,expected:q.options[q.correct!],why:q.explanation||'The answer is compared with the AI-generated answer key.',next:`Practice ${q.competency} with a new applied task.`}});
       const correct=details.filter(x=>x.is_correct).length;const pct=Math.round(correct/questions.length*100);
       const groups:Record<string,{correct:number;total:number}>={};
       for(const detail of details){const key=String(detail.competency||'General assessment');groups[key] ||= {correct:0,total:0};groups[key].total+=1;if(detail.is_correct)groups[key].correct+=1;}
       let saved:any=null;let saveNotice='This browser-generated result could not be saved to progress. Check the backend connection and retry if you want it tracked.';
       try{
         saved=await api<any>('/api/v1/practice/record-result',{method:'POST',body:JSON.stringify({source:d?.blind_transfer?'blind-transfer-practice':'browser-ai-practice',title:d.title||`${role} AI practice`,assessment_id:assessmentId,role,competency:d?.competency||blindSkill||undefined,correct,total:questions.length,competency_scores:Object.entries(groups).map(([competency,v])=>({competency,score:Math.round(v.correct/v.total*100),answered:v.total,total:v.total}))})});
         saveNotice=saved.notice||'Practice result was saved and will update role signals with a low-weight, unverified practice contribution.';
       }catch(e:any){saveNotice=e?.message||saveNotice;}
       setResult({score:pct,correct,total:questions.length,passed:pct>=70,details,summary:`${d?.blind_transfer?'Blind-transfer retest with a changed scenario. ':'Browser-generated AI practice assessment. '}${saveNotice}`,source:d?.blind_transfer?'Blind-transfer retest · browser AI':'AI-generated browser practice',role_progress:saved?.role_progress,progress_saved:Boolean(saved)});return;
     }
     const r=await api<Result>('/api/v1/assessment/submit',{method:'POST',body:JSON.stringify({assessment_id:assessmentId,answers})});
     setResult({...r,progress_saved:true});
   }catch(e:any){setAiError(e?.message||'Assessment submission failed. Your current answers remain on screen; retry after checking the backend connection.');}
   finally{setSubmitting(false)}
 }

 if(loading)return <div className="page challenge-flow-page diagnostic-loading-screen"><div className="page-head"><div><div className="eyebrow">ROLE BASELINE · {role}</div><h1>Preparing your assessment</h1><p>Getting the question set for your selected target role.</p></div></div><section className="panel challenge-loading-state" role="status" aria-live="polite"><div className="challenge-loading-mark" aria-hidden="true"><span/><span/><span/></div><h2>Preparing role-aligned questions</h2><p className="muted">Your previous results and progress are being preserved.</p></section></div>;
 if(!d)return <div className="page challenge-flow-page"><section className="panel defense-load-error" role="alert"><h2>AI assessment unavailable</h2><p>{aiError||'The AI question set could not be prepared. Your progress is unchanged.'}</p><div className="action-row"><button type="button" className="button primary" onClick={()=>setReloadKey(v=>v+1)}><RefreshCw size={14}/> Retry AI questions</button><button type="button" className="button" onClick={()=>window.location.assign('/profile')}><Target size={14}/> Review target role</button></div></section></div>;
 if(result)return <div ref={resultRef} tabIndex={-1} className="page space-y-5 assessment-result-screen" style={{scrollMarginTop:88}}><div className="page-head"><div><div className="eyebrow">{result.source||'Assessment result'}</div><h1>{result.score}% · {result.passed?'Continue journey':'Practice and retest'}</h1><p>{result.summary}</p></div><div className="action-row"><button className="button" onClick={()=>{setResult(null);setAnswers({});setI(0)}}><RefreshCw size={14}/> Retake</button><button className="button primary" onClick={()=>onNavigate(result.passed?'roadmap':'challenges')}>{result.passed?'Continue journey':'Practice gaps'} <ArrowRight size={15}/></button></div></div>{result.role_progress&&<section className="panel role-progress-result"><div className="eyebrow">Target-role impact · {result.role_progress.role||role}</div><div className="grid grid-4"><article className="metric-card"><span className="eyebrow">Role progress</span><strong>{result.role_progress.score==null?'—':`${result.role_progress.score}%`}</strong><small>Smoothed role-skill signal</small></article><article className="metric-card"><span className="eyebrow">Test / practice coverage</span><strong>{result.role_progress.assessment_covered_skill_count||0}/{result.role_progress.required_skill_count}</strong><small>{result.role_progress.assessment_coverage_percent}% coverage · {result.role_progress.assessed_skill_count} skills with a score signal</small></article><article className="metric-card"><span className="eyebrow">Evidence coverage</span><strong>{result.role_progress.evidence_covered_skill_count}/{result.role_progress.required_skill_count}</strong><small>{result.role_progress.evidence_coverage_percent}% of required skills</small></article><article className="metric-card"><span className="eyebrow">Open gaps</span><strong>{result.role_progress.gap_count}/{result.role_progress.required_skill_count}</strong><small>Counts, not a hiring prediction</small></article></div><p className="muted">This attempt recorded {result.correct}/{result.total} correct. Poor results can reduce an existing signal; browser-generated practice is lower-weight and unverified.</p></section>}{result.role_progress?.skills?.length>0&&<section className="panel role-progress-result"><div className="panel-head"><div><div className="eyebrow">COMPETENCY → GAP → EVIDENCE</div><h2>Skill-by-skill result</h2><p className="muted">Use this map to choose what to practice next. Assessment signals are not project artifacts.</p></div><BarChart3/></div><div className="target-list">{result.role_progress.skills.map((skill:any)=><article className="target-evidence" key={skill.competency}><div className="target-evidence-head"><div><b>{skill.competency}</b><small>{Number(skill.assessment_answer_count)||0} answers · {Number(skill.practice_attempt_count)||0} practice attempts · {Number(skill.evidence_count)||0} artifacts · {Number(skill.claim_count)||0} claims</small></div><span className={`tag ${skill.has_signal&&Number(skill.signal_percent)>=75?'good':skill.has_signal?'blue':'warn'}`}>{skill.has_signal?`${Number(skill.signal_percent)||0}% signal`:'Not assessed'}</span></div><div className="bar" style={{marginTop:8}}><i style={{width:`${Math.max(0,Math.min(100,Number(skill.signal_percent)||0))}%`}}/></div><small>{skill.gap?'OPEN GAP · practice and retest':skill.evidence_count>0?'Artifact evidence recorded':skill.has_signal?'Score saved · add an inspectable artifact':'No scored result yet'}</small></article>)}</div><div className="action-row" style={{marginTop:12}}><button className="button" onClick={()=>window.location.assign('/analytics')}>Open Analytics <BarChart3 size={14}/></button><button className="button" onClick={()=>window.location.assign('/evidence')}>Open Evidence <FileCheck2 size={14}/></button></div><p className="muted">{result.progress_saved?'This result was saved to your workspace.':'Saving did not complete; retry or check the backend connection.'}</p></section>}<section className="panel explainability-receipt"><div className="panel-head"><div><div className="eyebrow">EXPLAINABILITY RECEIPT</div><h2>Why this score was recorded</h2></div><FileCheck2/></div><div className="grid grid-4"><div className="signal"><b>Calculation</b><span>{result.correct}/{result.total} correct · {result.score}% for this attempt</span></div><div className="signal"><b>Scoring basis</b><span>{result.source||d?.source||'Question bank'} · keyed-answer comparison or labelled AI practice rubric</span></div><div className="signal"><b>Evaluator / version</b><span>{String(d?.source||result.source||'').toLowerCase().includes('normal')?'Skillsetra role question bank · stored answer key':`AI-generated practice key`}</span></div><div className="signal"><b>Prior attempt</b><span>{result.previous_score===null||result.previous_score===undefined?'No comparable previous score':`${result.previous_score}% · change ${Number(result.change)>0?'+':''}${result.change} points`}</span></div></div><p className="muted">{result.source?.toLowerCase().includes('blind-transfer')?'The question set was requested as a new-context transfer test. The novelty of the AI-generated scenario is not independently certified.':'The score reflects this response set only; it does not independently verify mastery or claims.'} The role coverage and evidence counts are shown separately above.</p></section><div className="grid grid-2">{result.details.map((x:any)=><article className="panel" key={x.question_id}><div className="panel-head"><h2>{x.competency}</h2>{x.is_correct?<CheckCircle2 color="var(--p-success)"/>:<XCircle color="var(--p-danger)"/>}</div><p><b>What you answered:</b> {x.selected>=0?x.expected===undefined?String(x.selected):questions.find(q=>q.id===x.question_id)?.options?.[x.selected]:'Not answered'}</p><p><b>What was expected:</b> {x.expected}</p><p><b>Why:</b> {x.why}</p><p><b>Next:</b> {x.next}</p></article>)}</div></div>;
 return <div className="page space-y-5">
  <div className="page-head"><div><div className="eyebrow">ASSESSMENT · {role}</div><h1>{d.title}</h1><p>Fresh AI-generated questions are prepared for your selected target role. Assessment scores are performance signals, not proof of mastery.</p></div><button className="button" onClick={()=>{window.location.assign('/onboarding?reset=1')}}><Target size={14}/> Reselect role</button></div>
  {blindTransfer&&<section className="panel blind-transfer-banner"><div className="panel-head"><div><div className="eyebrow">BLIND TRANSFER RETEST</div><h2>Prove you can transfer the skill</h2></div><RefreshCw/></div><p>This retest is designed to apply <b>{blindSkill||'the selected competency'}</b> in a different context rather than repeat a memorized answer. Questions are generated by AI service and browser-generated scores are labelled unverified practice signals.</p><button type="button" className="button primary" onClick={generateAISet} disabled={aiLoading}>{aiLoading?'Preparing new-context questions…':'Generate blind-transfer retest'}</button></section>}
  <section className="panel"><div className="panel-head"><div><div className="eyebrow">ASK AI</div><h2>Ask for one role-specific question</h2><p className="muted">Generate an extra question without changing your scored assessment.</p></div><MessageCircleQuestion/></div><div className="action-row"><button className="button primary" onClick={loadAI} disabled={aiLoading}>{aiLoading?'Thinking…':'Ask AI for a question'}</button>{aiQ&&<span className="tag blue">Generated for {role}</span>}</div>{aiQ&&<article ref={aiQuestionRef} className="question-card ai-generated-question" style={{scrollMarginTop:88}} tabIndex={-1}><div className="question-meta"><span>AI</span><span>{aiQ.competency}</span><span>{aiQ.difficulty}</span></div><h3>{aiQ.question}</h3><div className="option-grid">{aiQ.options.map((o,j)=><button type="button" aria-pressed={aiAnswer===String(j)} className={`option ${aiAnswer===String(j)?'selected':''}`} key={o} onClick={()=>setAiAnswer(String(j))}><span>{String.fromCharCode(65+j)}</span>{o}</button>)}</div>{aiAnswer!==null&&<div className={`signal ${Number(aiAnswer)===aiQ.correct?'good':'warn'}`} style={{marginTop:12}}><b>{Number(aiAnswer)===aiQ.correct?'Correct':'Review this answer'}</b><span>{aiQ.explanation||'Use the reasoning behind the best option as your next practice point.'}</span></div>}</article>}</section>
  <section className="panel"><div className="panel-head"><div><div className="eyebrow">AI-GENERATED QUESTIONS</div><h2>Role Baseline</h2><p className="muted">A fresh question set is generated automatically for your target role when this page opens. No built-in question bank is used.</p></div><BrainCircuit/></div><div className="action-row"><button className="button primary" onClick={generateAISet} disabled={aiLoading}><Sparkles size={14}/>{aiLoading?'Generating…':'Generate a fresh AI question set'}</button></div>{aiError&&<div className="notice error" role="alert">{aiError}</div>}</section>

  <section className="panel" id="assessment-current-question"><div className="eyebrow">AI-GENERATED PRACTICE · {answeredCount}/{questions.length} answered</div><div className="diagnostic-question-list">{questions.map((question,questionPosition)=><article ref={questionPosition===i?currentQuestionRef:null} className="question-card diagnostic-question-card" id={`ai-q-${question.id}-${questionPosition}`} key={`${question.id}-${questionPosition}`}><div className="question-meta"><span>AI Q{questionPosition+1}</span><span>{question.competency}</span><span>{question.difficulty}</span></div><h2>{question.question}</h2><div className="option-grid">{question.options.map((o,idx)=><button type="button" key={`${question.id}-${idx}`} aria-pressed={answers[question.id]===String(idx)} className={`option ${answers[question.id]===String(idx)?'selected':''}`} onClick={()=>chooseAnswer(question.id,idx,questionPosition)}><span>{String.fromCharCode(65+idx)}</span>{o}</button>)}</div>{answers[question.id]!==undefined&&<p className="choice-confirmation" role="status">Option {String.fromCharCode(65+Number(answers[question.id]))} selected.{questionPosition<questions.length-1?` Moving to question ${questionPosition+2}.`:" Final question answered; submit when ready."}</p>}<div className="action-row assessment-question-navigation"><button type="button" className="button" disabled={questionPosition===0||submitting} onClick={()=>moveToQuestion(questionPosition-1)}>← Previous question</button><span className="muted">Question {questionPosition+1} of {questions.length}</span>{questionPosition<questions.length-1?<button type="button" className="button primary" disabled={submitting} onClick={()=>moveToQuestion(questionPosition+1)}>Next question <ArrowRight size={15}/></button>:<button type="button" className="button primary" disabled={submitting||answeredCount<questions.length} onClick={submit}>{submitting?'Saving result…':'Score AI practice'} <ArrowRight size={15}/></button>}</div></article>)}</div></section>
 </div>
}
