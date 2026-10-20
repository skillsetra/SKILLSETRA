"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import AppLayout from "../../components/AppLayout";
import {useApp} from "../../components/AppProvider";
import {api} from "../../lib/api";
import {runPuter} from "../../lib/ai";
import {scrollToElement,focusWithoutScroll} from "../../lib/scroll";
import {ClipboardCheck,Play,Timer,Brain,CheckCircle2,XCircle,MinusCircle,RotateCcw} from "lucide-react";

type Question={id:string;competency:string;difficulty:string;question:string;options:string[];correct?:number;explanation?:string};
type CatalogItem={id:string;title:string;difficulty:string;skills:string[];time:string;questions:number};

function parseGeneratedAssessment(raw:string, count:number):Question[]{
 const text=String(raw||"").trim();
 const candidates=[text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"")];
 const objectMatch=text.match(/\{[\s\S]*\}/);if(objectMatch)candidates.push(objectMatch[0]);
 const arrayMatch=text.match(/\[[\s\S]*\]/);if(arrayMatch)candidates.push(arrayMatch[0]);
 for(const candidate of candidates){
  try{
   const parsed=JSON.parse(candidate);const list=Array.isArray(parsed)?parsed:parsed?.questions;
   if(!Array.isArray(list))continue;
   const clean:Question[]=[];
   for(const item of list){
    if(!item||typeof item.question!=="string"||!Array.isArray(item.options)||item.options.length!==4)continue;
    const correct=Number(item.correct);if(!Number.isInteger(correct)||correct<0||correct>3)continue;
    const question=item.question.trim();const options=item.options.map((option:unknown)=>String(option).trim());
    if(question.length<15||options.some((option:string)=>!option))continue;
    clean.push({id:`browser-ai-${clean.length+1}`,question,options,correct,competency:String(item.competency||"General reasoning").slice(0,120),difficulty:String(item.difficulty||"Intermediate").slice(0,40),explanation:String(item.explanation||"").slice(0,500)});
    if(clean.length>=count)break;
   }
   if(clean.length>=Math.min(3,count))return clean;
  }catch{/* try the next JSON shape */}
 }
 throw new Error("The AI response did not contain a valid assessment question set.");
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
 const [questionIndex,setQuestionIndex]=useState(0);
 const advanceTimerRef=useRef<number|null>(null);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [result,setResult]=useState<any>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [attemptId,setAttemptId]=useState("");
 const [draftNotice,setDraftNotice]=useState("");
 const [questionSource,setQuestionSource]=useState<"browser-ai"|"server-ai"|"built-in"|"">("");

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
       let restoredQuestions:Question[]=Array.isArray(draft.questions)?draft.questions:[];
       let restoredAssessmentId=String(draft.assessmentId||"");
       if(!restoredQuestions.length||!restoredAssessmentId){
        const q=await api<any>(`/api/v1/assessment?track=${encodeURIComponent(item.id)}`);
        restoredQuestions=q.questions||[];restoredAssessmentId=q.id||"";
       }
       if(alive&&restoredQuestions.length){setActive(item);setAssessmentId(restoredAssessmentId);setQuestions(restoredQuestions);setAnswers(draft.answers);setQuestionIndex(Math.max(0,Math.min(Number(draft.questionIndex)||0,restoredQuestions.length-1)));setAttemptId(draft.attemptId);if(["browser-ai","server-ai","built-in"].includes(draft.questionSource))setQuestionSource(draft.questionSource);setDraftNotice(`Restored your unfinished ${item.title} draft from this browser. It has not been submitted yet.`)}
      }
     }
    }catch{/* ignore unusable local drafts */}
   }catch(e:any){if(alive)setError(e.message||"Assessment catalog is unavailable.")}
  })();
  return()=>{alive=false};
 },[draftKey]);

 useEffect(()=>{
  if(!active||!questions.length||!attemptId||result)return;
  try{localStorage.setItem(draftKey,JSON.stringify({trackId:active.id,attemptId,answers,questionIndex,questions,assessmentId,questionSource,updatedAt:new Date().toISOString()}));setDraftNotice(`${questionSource==="browser-ai"?"Fresh AI-generated questions":questionSource==="server-ai"?"Fresh AI-generated questions":questionSource==="built-in"?"Built-in fallback questions":"Assessment questions"} · draft saved in this browser. Your result is not recorded until you submit.`)}
  catch{setDraftNotice("Draft saving is unavailable in this browser. Keep this page open until you submit.")}
 },[active,questions,assessmentId,questionSource,attemptId,answers,questionIndex,result,draftKey]);

 // When the result appears, bring it to the top of the viewport (below the fixed header) so the answer review is visible.
 useEffect(()=>{if(!result)return;scrollToElement(resultRef.current,{extra:20});focusWithoutScroll(resultRef.current)},[result]);

 async function start(item:CatalogItem){
  setBusy(true);setError("");setDraftNotice("");setResult(null);setAnswers({});setQuestionIndex(0);if(advanceTimerRef.current!==null)window.clearTimeout(advanceTimerRef.current);setAttemptId(crypto.randomUUID());
  setActive(item);setQuestions([]);setAssessmentId("");setQuestionSource("");
  const questionCount=Math.max(3,Math.min(15,Number(item.questions)||6));
  const role=String(user?.targetRole||"Full-Stack Developer").trim()||"Full-Stack Developer";
  const freshness=typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID().slice(0,8):`${Date.now()}`;
  const competency=`Fresh assessment ${freshness}; focus: ${item.title}; skills: ${item.skills.slice(0,4).join(", ")}`.slice(0,120);
  const localPrompt=`Create ${questionCount} fresh, non-repetitive multiple-choice questions for the Assessment Studio track "${item.title}". Focus on these skills: ${item.skills.join(", ")}. Target learner role: ${role}. Freshness seed: ${freshness}. Use practical application and plausible distractors; do not reuse common built-in questions. Return ONLY JSON: {"questions":[{"question":"...","competency":"...","difficulty":"Beginner|Intermediate|Advanced|Expert","options":["A","B","C","D"],"correct":0,"explanation":"Short reason"}]}. Each question must have exactly four options and one unambiguous correct zero-based option index.`;
  try{
   // Prefer the backend-generated prompt; if that endpoint is unavailable, still try
   // Puter directly. runPuter performs bounded fallback across alternate Puter models.
   let generated:any=null;
   let prompt=localPrompt;
   try{
    generated=await api<any>("/api/v1/assessment/generate",{method:"POST",body:JSON.stringify({role,provider:"puter",model:"openai/gpt-oss-20b",language:"English",count:questionCount,competency})});
    if(generated?.prompt)prompt=generated.prompt;
   }catch{
    setDraftNotice("Assessment API unavailable; trying browser AI with alternate Puter models before using built-in questions.");
   }
   if(generated?.mode==="server"){
    const serverQuestions:Question[]=generated.questions||[];
    if(!serverQuestions.length)throw new Error("The AI service returned no questions.");
    setQuestions(serverQuestions);setAssessmentId(generated.assessment_id||generated.id||"");setQuestionSource("server-ai");
    setDraftNotice("Fresh AI-generated questions are ready for this attempt.");
   }else{
    const raw=await runPuter(prompt,generated?.model||"openai/gpt-oss-20b");
    const freshQuestions=parseGeneratedAssessment(raw,questionCount);
    setQuestions(freshQuestions);setAssessmentId(generated?.assessment_id||`browser-ai-${freshness}`);setQuestionSource("browser-ai");
    setDraftNotice("Fresh AI-generated questions are ready. Alternate Puter models are tried automatically before built-in questions are used.");
   }
  }catch(aiError:any){
   try{
    const fallback=await api<any>(`/api/v1/assessment?track=${encodeURIComponent(item.id)}`);
    if(!fallback.questions?.length)throw new Error("No built-in questions are available for this track.");
    setQuestions(fallback.questions);setAssessmentId(fallback.id);setQuestionSource("built-in");setDraftNotice("Fresh AI questions could not be generated after trying alternate Puter models, so built-in track questions are being used for this attempt.");
   }catch(fallbackError:any){setError(`${aiError?.message||"AI question generation failed."} ${fallbackError?.message||"Built-in questions could not be loaded."}`);setQuestions([]);setActive(null)}
  }finally{setBusy(false)}
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
   let r:any;
   if(questionSource==="browser-ai"){
    const details=questions.map(q=>{const selected=Number(answers[q.id]??-1);const isCorrect=selected===Number(q.correct);return {question_id:q.id,question:q.question,competency:q.competency,selected,selected_text:selected>=0?q.options[selected]:"No answer selected",expected:q.options[Number(q.correct)]||"",why:q.explanation||"Review the reasoning behind the AI-generated answer key.",next:`Practice ${q.competency} with a new applied task.`,is_correct:isCorrect,answered:selected>=0}});
    const correct=details.filter((d:any)=>d.is_correct).length;const score=Math.round(correct/questions.length*100);
    let savedNotice="This attempt was scored in the browser but could not be saved to progress.";
    try{
     const grouped:Record<string,{correct:number;total:number}>={};
     for(const d of details){const key=String(d.competency||active.title);grouped[key] ||= {correct:0,total:0};grouped[key].total++;if(d.is_correct)grouped[key].correct++;}
     const saved=await api<any>("/api/v1/practice/record-result",{method:"POST",body:JSON.stringify({source:"assessment-studio-ai",title:`${active.title} · AI-generated assessment`,role:user?.targetRole||"Full-Stack Developer",correct,total:questions.length,competency_scores:Object.entries(grouped).map(([competency,v])=>({competency,score:Math.round(v.correct/v.total*100),answered:v.total,total:v.total}))})});
     savedNotice=saved.notice||"The practice result was saved.";
    }catch(saveError:any){savedNotice=saveError?.message||savedNotice;}
    r={score,correct,total:questions.length,passed:score>=70,details,summary:`AI-generated browser assessment. ${savedNotice}`,previous_score:null,change:null};
   }else{
    r=await api<any>("/api/v1/assessment/submit",{method:"POST",body:JSON.stringify({assessment_id:assessmentId,attempt_id:attemptId,answers})});
   }
   setResult(r);
   try{localStorage.removeItem(draftKey)}catch{}
   setDraftNotice("");
  }catch(e:any){setError(e.message||"Assessment submission failed. Your answers have not been confirmed as saved.")}
  finally{setBusy(false)}
 }

 function finish(){
  setResult(null);setAnswers({});setQuestionIndex(0);setQuestions([]);setActive(null);setAttemptId("");setAssessmentId("");setDraftNotice("");setQuestionSource("");
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
  <div className="page-head"><div><div className="eyebrow">Assessment Studio</div><h1>Measure knowledge, reasoning and transfer.</h1><p>Each attempt requests a fresh AI-generated question set. If the AI service and its alternate Puter models are unavailable, SKILLSETRA falls back to built-in track questions; your role baseline lives under Role Baseline.</p></div></div>
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
