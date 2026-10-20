"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import AppLayout from "../../components/AppLayout";
import {useApp} from "../../components/AppProvider";
import {api} from "../../lib/api";
import {scrollToElement,focusWithoutScroll} from "../../lib/scroll";
import {runPuter} from "../../lib/ai";
import {ClipboardCheck,Play,Timer,Brain,CheckCircle2,XCircle,MinusCircle,RotateCcw} from "lucide-react";

type Question={id:string;competency:string;difficulty:string;question:string;options:string[];correct?:number;explanation?:string};
type CatalogItem={id:string;title:string;difficulty:string;skills:string[];time:string;questions:number};
function parseAssessmentAI(raw:string, count=8):Question[]{
 const text=String(raw||'').trim(); const candidates=[text.replace(/```json/gi,'').replace(/```/g,'').trim()];
 const object=text.match(/\{[\s\S]*\}/); if(object)candidates.push(object[0]);
 const array=text.match(/\[[\s\S]*\]/); if(array)candidates.push(array[0]);
 for(const candidate of candidates){try{
  const parsed=JSON.parse(candidate); const rows=Array.isArray(parsed)?parsed:parsed.questions; if(!Array.isArray(rows))continue;
  const out:Question[]=[];
  for(const [i,q] of rows.entries()){
   if(!q||typeof q.question!=='string'||q.question.trim().length<15||!Array.isArray(q.options)||q.options.length!==4)continue;
   const correct=Number(q.correct); const options=q.options.map((x:any)=>String(x).trim());
   if(!Number.isInteger(correct)||correct<0||correct>3||options.some((x:string)=>!x||x.length>500)||new Set(options).size!==4)continue;
   out.push({id:`ai-${crypto.randomUUID()}-${i}`,competency:String(q.competency||'Role fundamentals').slice(0,120),difficulty:String(q.difficulty||'Intermediate').slice(0,40),question:q.question.trim(),options,correct,explanation:String(q.explanation||'').slice(0,500)});
  }
  if(out.length>=Math.min(3,count))return out.slice(0,count);
 }catch{}}
 throw new Error('AI did not return a valid assessment question set.');
}

export default function Assessments(){
 const router=useRouter();
 const {user}=useApp();
 const draftKey=`skillsetra_assessment_draft_v2:${user?.id||"anonymous"}`;
 const currentQuestionRef=useRef<HTMLFieldSetElement|null>(null);
 const resultRef=useRef<HTMLDivElement|null>(null);
 const [items,setItems]=useState<CatalogItem[]>([]);
 const [active,setActive]=useState<CatalogItem|null>(null);
 const [assessmentId,setAssessmentId]=useState("");
 const [questions,setQuestions]=useState<Question[]>([]);
 const [browserAI,setBrowserAI]=useState(false);
 const [questionIndex,setQuestionIndex]=useState(0);
 const advanceTimerRef=useRef<number|null>(null);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [result,setResult]=useState<any>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [attemptId,setAttemptId]=useState("");
 const [draftNotice,setDraftNotice]=useState("");

 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const r=await api<any>("/api/v1/assessments/catalog");const catalog:CatalogItem[]=r.items||[];
    if(!alive)return;setItems(catalog);
    try{
     const raw=localStorage.getItem(draftKey);
     if(raw){
      const draft=JSON.parse(raw);const item=catalog.find(x=>x.id===draft.trackId);
      if(item&&draft.attemptId&&draft.answers&&typeof draft.answers==="object"){
       const q=draft.assessmentId?.startsWith("ai-fallback-")
        ? await api<any>(`/api/v1/assessment?assessment_id=${encodeURIComponent(draft.assessmentId)}`)
        : await api<any>(`/api/v1/assessment?track=${encodeURIComponent(item.id)}`);
       if(alive&&q.questions?.length){setActive(item);setAssessmentId(q.id);setQuestions(q.questions);setAnswers(draft.answers);setQuestionIndex(Math.max(0,Math.min(Number(draft.questionIndex)||0,q.questions.length-1)));setAttemptId(draft.attemptId);setBrowserAI(false);setDraftNotice(`Restored your unfinished ${item.title} draft from this browser. It has not been submitted yet.`)}
      }
     }
    }catch{/* ignore unusable local drafts */}
   }catch(e:any){if(alive)setError(e.message||"Assessment catalog is unavailable.")}
  })();
  return()=>{alive=false};
 },[draftKey]);

 useEffect(()=>{
  if(!active||!questions.length||!attemptId||result)return;
  if(browserAI){try{localStorage.removeItem(draftKey)}catch{};setDraftNotice("AI-generated questions stay in this session until submitted. Submit this assessment to save its result to progression.");return;}
  try{localStorage.setItem(draftKey,JSON.stringify({trackId:active.id,assessmentId,attemptId,answers,questionIndex,updatedAt:new Date().toISOString()}));setDraftNotice("Draft is saved in this browser. Your result is not recorded until you submit the assessment.")}
  catch{setDraftNotice("Draft saving is unavailable in this browser. Keep this page open until you submit.")}
 },[active,questions,attemptId,assessmentId,answers,questionIndex,result,draftKey,browserAI]);

 // When the result appears, bring it to the top of the viewport (below the fixed header) so the answer review is visible.
 useEffect(()=>{if(!result)return;scrollToElement(resultRef.current,{extra:20});focusWithoutScroll(resultRef.current)},[result]);

 async function start(item:CatalogItem){
  setBusy(true);setError("");setDraftNotice("");setResult(null);setAnswers({});setQuestionIndex(0);setBrowserAI(false);
  if(advanceTimerRef.current!==null)window.clearTimeout(advanceTimerRef.current);
  const role=String((user as any)?.targetRole||(user as any)?.target_role||"Full-Stack Developer").trim();
  try{
   // AI is attempted first. runPuter already tries the requested model and multiple Puter model fallbacks.
   try{
    const generated=await api<any>("/api/v1/assessment/generate",{method:"POST",body:JSON.stringify({role,provider:"puter",model:"openai/gpt-oss-20b",language:"English",count:8,competency:item.skills.join(", ")})});
    if(generated.mode==="puter-client"){
     const raw=await runPuter(generated.prompt,generated.model||"openai/gpt-oss-20b");
     const aiQuestions=parseAssessmentAI(raw,8);
     setQuestions(aiQuestions);setAssessmentId(`browser-ai-${crypto.randomUUID()}`);setActive(item);setBrowserAI(true);setAttemptId(crypto.randomUUID());
     return;
    }
    if(Array.isArray(generated.questions)&&generated.questions.length){
     setQuestions(generated.questions);setAssessmentId(generated.assessment_id||generated.id);setActive(item);setAttemptId(crypto.randomUUID());return;
    }
    throw new Error("AI returned no questions.");
   }catch(aiError){
    // A bounded, randomized built-in bank is the final fallback if the API or all Puter models fail.
    const fallback=await api<any>(`/api/v1/assessment?track=${encodeURIComponent(item.id)}&fresh=1`);
    if(!fallback.questions?.length)throw new Error("Neither AI generation nor the built-in question bank returned questions.");
    setQuestions(fallback.questions);setAssessmentId(fallback.id);setActive(item);setAttemptId(crypto.randomUUID());setBrowserAI(false);
    setDraftNotice("AI question generation was unavailable, so a fresh randomized built-in question set is being used.");
   }
  }catch(e:any){setError(e.message||"Could not load assessment questions.");setQuestions([]);setActive(null);setAssessmentId("")}
  finally{setBusy(false)}
 }

 function choose(q:Question,index:number,questionPosition:number){
  if(advanceTimerRef.current!==null){window.clearTimeout(advanceTimerRef.current);advanceTimerRef.current=null;}
  setAnswers(a=>({...a,[q.id]:String(index)}));
  setQuestionIndex(questionPosition);
  // Keep the green selection visible briefly, then scroll to the next stacked card.
  if(questionPosition<questions.length-1){
   advanceTimerRef.current=window.setTimeout(()=>{setQuestionIndex(questionPosition+1);advanceTimerRef.current=null},500);
  }
 }
 function moveToQuestion(next:number){
  if(advanceTimerRef.current!==null){window.clearTimeout(advanceTimerRef.current);advanceTimerRef.current=null;}
  setQuestionIndex(Math.max(0,Math.min(next,questions.length-1)));
 }

 async function submit(){
  if(!active||!questions.length||busy)return;
  const missing=questions.filter(q=>answers[q.id]===undefined);
  if(missing.length&&!window.confirm(`${missing.length} question${missing.length===1?" is":"s are"} unanswered and will count as incorrect. Submit anyway?`)){moveToQuestion(Math.max(0,questions.findIndex(q=>q.id===missing[0].id)));return}
  setBusy(true);setError("");
  try{
   if(browserAI){
    const details=questions.map(q=>{const selected=Number(answers[q.id]??-1);const correct=Number(q.correct);return {question_id:q.id,question:q.question,competency:q.competency,difficulty:q.difficulty,options:q.options,selected,selected_text:selected>=0?q.options[selected]:null,correct,is_correct:selected===correct,answered:selected>=0,expected:q.options[correct],why:q.explanation||"The selected answer is compared with the AI-generated answer key.",next:`Practice ${q.competency} with a new applied task.`}});
    const correct=details.filter(d=>d.is_correct).length;const groups:Record<string,{correct:number;total:number}>={};
    for(const d of details){const key=String(d.competency||"General assessment");groups[key] ||= {correct:0,total:0};groups[key].total++;if(d.is_correct)groups[key].correct++;}
    const saved=await api<any>("/api/v1/practice/record-result",{method:"POST",body:JSON.stringify({source:"browser-ai-practice",title:`${active.title} · AI-generated assessment`,assessment_id:assessmentId,role:String((user as any)?.targetRole||(user as any)?.target_role||"Full-Stack Developer"),correct,total:questions.length,competency_scores:Object.entries(groups).map(([competency,v])=>({competency,score:Math.round(v.correct/v.total*100),answered:v.total,total:v.total}))})});
    setResult({score:Math.round(correct/questions.length*100),correct,total:questions.length,passed:Math.round(correct/questions.length*100)>=70,details,summary:saved.notice||"AI-generated assessment saved as an unverified practice signal.",source:"AI-generated assessment · client-scored practice",role_progress:saved.role_progress,progress_saved:true});
   }else{
    const r=await api<any>("/api/v1/assessment/submit",{method:"POST",body:JSON.stringify({assessment_id:assessmentId,attempt_id:attemptId,answers})});
    setResult(r);
   }
   try{localStorage.removeItem(draftKey)}catch{}
   setDraftNotice("");
  }catch(e:any){setError(e.message||"Assessment submission failed. Your answers have not been confirmed as saved.")}
  finally{setBusy(false)}
 }

 function finish(){
  setResult(null);setAnswers({});setQuestionIndex(0);setQuestions([]);setActive(null);setAttemptId("");setAssessmentId("");setDraftNotice("");setBrowserAI(false);
  try{localStorage.removeItem(draftKey)}catch{}
  window.scrollTo({top:0,behavior:"smooth"});
 }

 const answered=Object.keys(answers).length;
 const currentQuestion=questions[questionIndex];
 useEffect(()=>{
  if(!active||!currentQuestion||result)return;
  const frame=window.requestAnimationFrame(()=>scrollToElement(currentQuestionRef.current||document.getElementById(`as-q-${currentQuestion.id}-${questionIndex}`),{extra:24}));
  return()=>window.cancelAnimationFrame(frame);
 },[active?.id,questionIndex,currentQuestion?.id,result]);
 useEffect(()=>()=>{if(advanceTimerRef.current!==null)window.clearTimeout(advanceTimerRef.current)},[]);
 return <AppLayout><div className="page">
  <div className="page-head"><div><div className="eyebrow">Assessment Studio</div><h1>Measure knowledge, reasoning and transfer.</h1><p>Choose a track for a fresh AI-generated question set. If AI and its Puter model fallbacks are unavailable, Assessment Studio automatically uses a randomized built-in question set. Scores update role progression and analytics as assessment signals.</p></div></div>
  {error&&<div className="error" role="alert">{error}</div>}
  {draftNotice&&<div className="notice" role="status">{draftNotice}</div>}
  <div className="grid grid-3">{items.map(x=><article className={`panel track-card ${active?.id===x.id?"is-active":""}`} key={x.id}>
   <div className="panel-head"><div><span className="tag blue">{x.difficulty}</span><h2>{x.title}</h2></div><ClipboardCheck/></div>
   <p className="muted">{x.skills.join(" · ")}</p>
   <div className="action-row"><span className="tag"><Timer size={12}/>{x.time}</span><span className="tag">{x.questions} questions</span></div>
   <button type="button" className="button primary" style={{marginTop:14,width:"100%"}} disabled={busy} onClick={()=>start(x)}><Play size={14}/> {active?.id===x.id&&!result?"Restart":"Start"} assessment</button>
  </article>)}</div>
  {active&&questions.length>0&&<section className="panel" style={{marginTop:16}} id="assessment-panel">
   <div className="panel-head"><div><div className="eyebrow">{active.title} · {answered}/{questions.length} answered</div><h2>{active.title}</h2><p className="muted">Unanswered questions count as incorrect.</p></div><Brain/></div>
   {!result?<>
    <div className="assessment-questions" aria-label="Assessment questions">
     {questions.map((question,questionPosition)=><fieldset ref={questionPosition===questionIndex?currentQuestionRef:null} className="claim question-fieldset" id={`as-q-${question.id}-${questionPosition}`} key={`${question.id}-${questionPosition}`}>
      <legend><b>{questionPosition+1}. {question.question}</b></legend>
      <p className="muted">{question.competency} · {question.difficulty} · Question {questionPosition+1} of {questions.length}</p>
      {question.options.map((option,index)=><label key={`${question.id}-${index}`} className={`choice-row ${answers[question.id]===String(index)?"checked":""}`}>
       <input type="radio" name={`${question.id}-${questionPosition}`} checked={answers[question.id]===String(index)} onChange={()=>choose(question,index,questionPosition)}/><span>{option}</span>
      </label>)}
      {answers[question.id]!==undefined&&<p className="choice-confirmation" role="status">Option {String.fromCharCode(65+Number(answers[question.id]))} selected.{questionPosition<questions.length-1?` Moving to question ${questionPosition+2}.`:" Final question answered; submit when ready."}</p>}
      <div className="action-row assessment-question-navigation">
       <button type="button" className="button" disabled={busy||questionPosition===0} onClick={()=>moveToQuestion(questionPosition-1)}>← Previous question</button>
       <span className="muted" aria-live="polite">Question {questionPosition+1} of {questions.length}</span>
       {questionPosition<questions.length-1
        ? <button type="button" className="button primary" disabled={busy} onClick={()=>moveToQuestion(questionPosition+1)}>Next question →</button>
        : <button type="button" className="button primary" onClick={submit} disabled={busy||!answered}><CheckCircle2 size={14}/>{busy?"Submitting…":"Submit assessment"}</button>}
      </div>
     </fieldset>)}
    </div>
    <div className="action-row assessment-question-navigation assessment-draft-actions">
     <span className="muted" aria-live="polite">{answered} of {questions.length} answered</span>
     <button type="button" className="button" disabled={busy||browserAI} onClick={()=>router.push("/dashboard")}>{browserAI?"Submit to save AI result":"Save draft &amp; return later"}</button>
    </div>
   </>:<div ref={resultRef} tabIndex={-1} aria-live="polite" className="assessment-result" style={{scrollMarginTop:90}}>
    <div className={`signal ${result.passed?"good":"warn"}`}><h3>Attempt result: {result.score}%</h3>
     <p>{result.correct} correct out of {result.total}. {result.previous_score!==null&&result.previous_score!==undefined?`Previous attempt on this track: ${result.previous_score}%. Change: ${result.change>0?"+":""}${result.change} percentage points.`:"No previous attempt for this track to compare."}</p>
     <p>{result.passed?"You met the 70% threshold.":"Review the explanations below and practice before retesting."}</p><p className="muted">{result.summary}</p></div>
    {result.role_progress?.configured ? <section className="panel assessment-progress-impact" aria-label="Goal and role progression update">
     <div className="panel-head"><div><div className="eyebrow">GOAL &amp; ROLE PROGRESSION UPDATED</div><h2>Your assessment's impact</h2><p className="muted">This result updates overall goal progress and Analytics. Competency-level graphs update only for skills supported by this assessment’s topic mapping; unrelated tracks do not invent skill signals. Assessment scores are performance signals, not independent proof of mastery.</p></div><Brain/></div>
     <div className="grid grid-4">
      <article className="metric-card"><span className="eyebrow">Overall goal progress</span><strong>{Number.isFinite(Number(result.role_progress.progress_percent))?`${Number(result.role_progress.progress_percent)}%`:"—"}</strong><small>{typeof result.goal_progress_change==="number"?`${result.goal_progress_change>0?"+":""}${result.goal_progress_change} percentage points after this attempt`:"Progress baseline recorded"}</small></article>
      <article className="metric-card"><span className="eyebrow">Role performance signal</span><strong>{result.role_progress.score==null?"—":`${Number(result.role_progress.score)}%`}</strong><small>{Number(result.role_progress.assessed_skill_count)||0} of {Number(result.role_progress.required_skill_count)||0} required skills have a score signal</small></article>
      <article className="metric-card"><span className="eyebrow">Assessment coverage</span><strong>{Number(result.role_progress.assessment_coverage_percent)||0}%</strong><small>{Number(result.role_progress.assessment_covered_skill_count)||0} required skills touched by mapped assessments or practice</small></article>
      <article className="metric-card"><span className="eyebrow">Assessment score trend</span><strong>{result.role_progress.assessment_activity_score_percent==null?`${Number(result.score)||0}%`:`${Number(result.role_progress.assessment_activity_score_percent)}%`}</strong><small>Average of {Number(result.role_progress.scored_assessment_count)||1} completed scored assessment(s)</small></article>
     </div>
     <div className="action-row" style={{marginTop:12}}><a className="button primary" href="/analytics">View updated analytics &amp; graphs</a><a className="button secondary" href="/dashboard">View dashboard</a></div>
    </section> : <div className="notice" role="status">Your assessment score has been saved. Select a target role in your profile to connect future assessment results to goal and role progression.</div>}
    <div className="review-list">{(result.details||[]).map((d:any,i:number)=><article key={d.question_id} className={`review-item ${d.is_correct?"ok":d.answered===false?"skip":"bad"}`}>
     <header><span className="review-badge">{d.is_correct?<><CheckCircle2 size={14}/> Correct</>:d.answered===false?<><MinusCircle size={14}/> Not answered</>:<><XCircle size={14}/> Needs review</>}</span><span className="review-comp">Q{i+1} · {d.competency}</span></header>
     <h3>{d.question}</h3>
     <dl><dt>Your answer</dt><dd>{d.selected_text??"No answer selected"}</dd>{!d.is_correct&&<><dt>Best answer</dt><dd>{d.expected}</dd></>}<dt>Why</dt><dd>{d.why}</dd>{!d.is_correct&&<><dt>Next step</dt><dd>{d.next}</dd></>}</dl>
    </article>)}</div>
    <button type="button" className="button" style={{marginTop:14}} onClick={finish}><RotateCcw size={14}/> Finish and choose a retest</button>
   </div>}
  </section>}
 </div></AppLayout>
}
