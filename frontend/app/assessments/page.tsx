"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import AppLayout from "../../components/AppLayout";
import {useApp} from "../../components/AppProvider";
import {api} from "../../lib/api";
import {scrollToElement,focusWithoutScroll} from "../../lib/scroll";
import {ClipboardCheck,Play,Timer,Brain,CheckCircle2,XCircle,MinusCircle,RotateCcw} from "lucide-react";

type Question={id:string;competency:string;difficulty:string;question:string;options:string[]};
type CatalogItem={id:string;title:string;difficulty:string;skills:string[];time:string;questions:number};

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
       const q=await api<any>(`/api/v1/assessment?track=${encodeURIComponent(item.id)}`);
       if(alive&&q.questions?.length){setActive(item);setAssessmentId(q.id);setQuestions(q.questions);setAnswers(draft.answers);setQuestionIndex(Math.max(0,Math.min(Number(draft.questionIndex)||0,q.questions.length-1)));setAttemptId(draft.attemptId);setDraftNotice(`Restored your unfinished ${item.title} draft from this browser. It has not been submitted yet.`)}
      }
     }
    }catch{/* ignore unusable local drafts */}
   }catch(e:any){if(alive)setError(e.message||"Assessment catalog is unavailable.")}
  })();
  return()=>{alive=false};
 },[draftKey]);

 useEffect(()=>{
  if(!active||!questions.length||!attemptId||result)return;
  try{localStorage.setItem(draftKey,JSON.stringify({trackId:active.id,attemptId,answers,questionIndex,updatedAt:new Date().toISOString()}));setDraftNotice("Draft is saved in this browser. Your result is not recorded until you submit the assessment.")}
  catch{setDraftNotice("Draft saving is unavailable in this browser. Keep this page open until you submit.")}
 },[active,questions,attemptId,answers,questionIndex,result,draftKey]);

 // When the result appears, bring it to the top of the viewport (below the fixed header) so the answer review is visible.
 useEffect(()=>{if(!result)return;scrollToElement(resultRef.current,{extra:20});focusWithoutScroll(resultRef.current)},[result]);

 async function start(item:CatalogItem){
  setBusy(true);setError("");setDraftNotice("");setResult(null);setAnswers({});setQuestionIndex(0);if(advanceTimerRef.current!==null)window.clearTimeout(advanceTimerRef.current);setAttemptId(crypto.randomUUID());
  try{
   const r=await api<any>(`/api/v1/assessment?track=${encodeURIComponent(item.id)}`);
   if(!r.questions?.length)throw new Error("No assessment questions are available.");
   setQuestions(r.questions);setAssessmentId(r.id);setActive(item);
   // The question-list effect scrolls to the first card after React commits the bank.
  }catch(e:any){setError(e.message||"Could not load assessment questions.");setQuestions([]);setActive(null)}
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
   const r=await api<any>("/api/v1/assessment/submit",{method:"POST",body:JSON.stringify({assessment_id:assessmentId,attempt_id:attemptId,answers})});
   setResult(r);
   try{localStorage.removeItem(draftKey)}catch{}
   setDraftNotice("");
  }catch(e:any){setError(e.message||"Assessment submission failed. Your answers have not been confirmed as saved.")}
  finally{setBusy(false)}
 }

 function finish(){
  setResult(null);setAnswers({});setQuestionIndex(0);setQuestions([]);setActive(null);setAttemptId("");setAssessmentId("");setDraftNotice("");
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
  <div className="page-head"><div><div className="eyebrow">Assessment Studio</div><h1>Measure knowledge, reasoning and transfer.</h1><p>Choose a track, answer its questions, and review the scored attempt with the reason behind every answer. Each track has its own question set; your role baseline lives under Role Baseline.</p></div></div>
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
     <button type="button" className="button" disabled={busy} onClick={()=>router.push("/dashboard")}>Save draft &amp; return later</button>
    </div>
   </>:<div ref={resultRef} tabIndex={-1} aria-live="polite" className="assessment-result" style={{scrollMarginTop:90}}>
    <div className={`signal ${result.passed?"good":"warn"}`}><h3>Attempt result: {result.score}%</h3>
     <p>{result.correct} correct out of {result.total}. {result.previous_score!==null&&result.previous_score!==undefined?`Previous attempt on this track: ${result.previous_score}%. Change: ${result.change>0?"+":""}${result.change} percentage points.`:"No previous attempt for this track to compare."}</p>
     <p>{result.passed?"You met the 70% threshold.":"Review the explanations below and practice before retesting."}</p><p className="muted">{result.summary}</p></div>
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
