"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {safeHref} from "../../lib/safeUrl";
import AppLayout from "../../components/AppLayout";
import {useApp} from "../../components/AppProvider";
import {api} from "../../lib/api";
import {runPuter} from "../../lib/ai";
import {scrollToElement,scrollToTop,focusWithoutScroll} from "../../lib/scroll";
import {ArrowLeft,ArrowRight,CheckCircle2,XCircle,MinusCircle,Target,BrainCircuit,BookOpen,FileCheck2,RotateCcw} from "lucide-react";

type Q={id:string;competency:string;difficulty:string;question:string;options:string[];correct?:number;explanation?:string};
type Detail={question_id:string;question:string;competency:string;options:string[];selected:number;selected_text:string|null;expected:string;why:string;next:string;is_correct:boolean;answered:boolean};
type Result={score:number;correct:number;total:number;details:Detail[];summary:string;source:string;passed?:boolean;role_progress?:any;progress_saved?:boolean};

function parseGenerated(raw:string):Q[]{
 const text=(raw||"").trim();
 const candidates=[text.replace(/```json/gi,"").replace(/```/g,"").trim()];
 const m=text.match(/\{[\s\S]*\}/);if(m)candidates.push(m[0]);
 const arr=text.match(/\[[\s\S]*\]/);if(arr)candidates.push(arr[0]);
 for(const c of candidates){
  try{
   const o=JSON.parse(c);const list=Array.isArray(o)?o:o.questions;if(!Array.isArray(list))continue;
   const out=list.map((x:any,i:number)=>({id:`ai-${i+1}`,competency:String(x.competency||"Role fundamentals"),difficulty:String(x.difficulty||"Intermediate"),question:String(x.question||""),options:Array.isArray(x.options)?x.options.map((v:any)=>String(v)):[],correct:Number(x.correct),explanation:String(x.explanation||"")}))
    .filter((x:Q)=>x.question.length>10&&x.options.length===4&&Number.isInteger(x.correct)&&(x.correct as number)>=0&&(x.correct as number)<4);
   if(out.length>=3)return out;
  }catch{}
 }
 throw new Error("AI returned an invalid question set.");
}

const roles=["ML Engineer","AI Engineer","Data Scientist","Data Analyst","Backend Developer","Full-Stack Developer","Frontend Developer","Python Developer","DevOps Engineer","Cybersecurity","Cloud Engineer","Product Data Engineer"];

/** Rank catalogue resources by role match and by whether they cover a detected gap. */
function rankResources(items:any[],role:string,gaps:string[]){
 const gapText=gaps.map(g=>g.toLowerCase());
 const score=(r:any)=>{
  let s=0;
  if(Array.isArray(r.roles)&&r.roles.includes(role))s+=3;
  const hay=`${r.title||""} ${r.competency||""} ${r.field||""}`.toLowerCase();
  if(gapText.some(g=>g&&(hay.includes(g)||g.split(" ").some(w=>w.length>4&&hay.includes(w)))))s+=2;
  return s;
 };
 return [...items].map(r=>({r,s:score(r)})).sort((a,b)=>b.s-a.s).map(x=>x.r);
}

export default function Onboarding(){
 const router=useRouter();
 const {user,setTargetRole}=useApp();
 const [step,setStep]=useState(1);
 const [role,setRole]=useState("");
 const [experience,setExperience]=useState("Early career");
 const [goal,setGoal]=useState("Become job-ready with credible evidence");
 const [questions,setQuestions]=useState<Q[]>([]);
 const [loadedRole,setLoadedRole]=useState("");
 const [attemptedRole,setAttemptedRole]=useState("");
 const roleChoiceSeq=useRef(0);
 const roleSaveQueueRef=useRef<Promise<unknown>>(Promise.resolve());
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [result,setResult]=useState<Result|null>(null);
 const [resources,setResources]=useState<any[]>([]);
 const [assessmentId,setAssessmentId]=useState("adaptive-v1");
 const [browserAI,setBrowserAI]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const loadSeq=useRef(0);
 const prevStep=useRef(1);
 const resultRef=useRef<HTMLElement|null>(null);
 const assessmentSectionRef=useRef<HTMLElement|null>(null);
 const firstQuestionRef=useRef<HTMLElement|null>(null);
 const answerScrollTimerRef=useRef<number|null>(null);

 // Start new journeys at the top, then explicitly move users to the assessment when they choose a role.
 useEffect(()=>{window.scrollTo({top:0,behavior:"auto"})},[]);
 useEffect(()=>()=>{if(answerScrollTimerRef.current!==null)window.clearTimeout(answerScrollTimerRef.current)},[]);
 // When changing role from the sidebar, highlight the current role so the choice is visible.
 useEffect(()=>{if(user?.targetRole&&!role&&roles.includes(user.targetRole))setRole(user.targetRole)},[user?.targetRole]); // eslint-disable-line react-hooks/exhaustive-deps

 const resetAssessment=useCallback(()=>{
  loadSeq.current+=1; // invalidate any in-flight request for the previous role
  setQuestions([]);setLoadedRole("");setAttemptedRole("");setAnswers({});setResult(null);setAssessmentId("adaptive-v1");setBrowserAI(false);setNotice("");setError("");setLoading(false);
 },[]);

 async function chooseRole(next:string){
  const choiceVersion=++roleChoiceSeq.current;
  setRole(next);setTargetRole(next);setError("");setNotice("");
  // The question bank starts immediately; saving the profile must not block role switching or make the picker unusable.
  resetAssessment();setStep(2);
  const endpoint=new URLSearchParams(window.location.search).get("reset")==="1"?"/api/v1/profile/reselect-role":"/api/v1/profile/goal";
  const save=roleSaveQueueRef.current.catch(()=>undefined).then(()=>api(endpoint,{method:"POST",body:JSON.stringify({target_role:next,experience,goal})}));
  roleSaveQueueRef.current=save;
  try{await save}catch(e:any){
   if(choiceVersion===roleChoiceSeq.current)setNotice(`Your ${next} assessment is starting. We could not save the role to your profile yet; your answers will still be available in this session. ${e.message||"Please check the server connection before leaving this page."}`);
  }
 }

 function returnToRolePicker(){
  roleChoiceSeq.current+=1;
  resetAssessment();
  setStep(1);
 }

 const loadQuestions=useCallback(async(roleName:string)=>{
  const seq=++loadSeq.current;
  setAttemptedRole(roleName);
  setLoading(true);setError("");
  try{
   const provider="puter",model="openai/gpt-oss-20b";
   const r=await api<any>("/api/v1/assessment/generate",{method:"POST",body:JSON.stringify({role:roleName,provider,model,language:"English",count:8})});
   let generated:Q[];let id="adaptive-v1";let browser=false;
   if(r.mode==="puter-client"){generated=parseGenerated(await runPuter(r.prompt,r.model||model)).slice(0,8);id="browser-ai-practice";browser=true}
   else{generated=Array.isArray(r.questions)?r.questions:[];id=r.assessment_id||"adaptive-v1"}
   if(!generated.length)throw new Error(`No ${roleName} questions were returned. Loading the built-in assessment instead.`);
   if(seq!==loadSeq.current)return; // the learner picked another role while this was loading
   setQuestions(generated);setAssessmentId(id);setBrowserAI(browser);setLoadedRole(roleName);
  }catch(e:any){
   if(seq!==loadSeq.current)return;
   try{
    // Built-in, role-specific question bank (served for exactly this role).
    const fallback=await api<any>(`/api/v1/assessment?role=${encodeURIComponent(roleName)}`);
    if(seq!==loadSeq.current)return;
    const fallbackQuestions=Array.isArray(fallback.questions)?fallback.questions:[];
    if(!fallbackQuestions.length)throw new Error(`No built-in assessment questions are available for ${roleName}.`);
    setQuestions(fallbackQuestions);setAssessmentId(fallback.id||"adaptive-v1");setBrowserAI(false);setLoadedRole(roleName);
    setNotice(`AI question generation was unavailable, so SKILLSETRA loaded the built-in ${roleName} assessment instead.`);
   }catch(f:any){
    if(seq!==loadSeq.current)return;
    setError(f.message||e.message||"Could not load the baseline questions.");
   }
  }finally{if(seq===loadSeq.current)setLoading(false)}
 },[]);

 // Load (or reload) questions whenever we are on step 2 and they do not belong to the chosen role.
 useEffect(()=>{if(step===2&&role&&loadedRole!==role&&attemptedRole!==role&&!loading)loadQuestions(role)},[step,role,loadedRole,attemptedRole,loading,loadQuestions]);

 // Move the viewport when the step changes; refs avoid picking a stale element with a repeated id.
 useEffect(()=>{
  const previous=prevStep.current;prevStep.current=step;
  if(previous===step)return;
  if(step===1){scrollToTop({instant:true});return}
  const t=window.setTimeout(()=>{
   if(step===2)scrollToElement(assessmentSectionRef.current,{extra:18});
   if(step===3)scrollToElement(resultRef.current,{extra:18});
  },40);
  return()=>window.clearTimeout(t);
 },[step]);
 // Once role-specific questions are actually present, scroll to the first question—not only the section heading.
 useEffect(()=>{
  if(step!==2||loading||!questions.length||loadedRole!==role)return;
  const t=window.setTimeout(()=>scrollToElement(firstQuestionRef.current||assessmentSectionRef.current,{extra:22}),80);
  return()=>window.clearTimeout(t);
 },[step,loading,questions.length,loadedRole,role]);
 useEffect(()=>{if(step===3&&result)focusWithoutScroll(resultRef.current)},[step,result]);

 function pick(q:Q,index:number,questionPosition:number){
  setAnswers(a=>({...a,[q.id]:String(index)}));
  if(answerScrollTimerRef.current!==null)window.clearTimeout(answerScrollTimerRef.current);
  const next=questions[questionPosition+1];
  answerScrollTimerRef.current=window.setTimeout(()=>{
   answerScrollTimerRef.current=null;
   if(next)scrollToElement(document.getElementById(`onb-q-${next.id}`),{extra:22});
   else scrollToElement(document.getElementById("onb-submit-assessment"),{extra:24});
  },420);
 }

 async function submitAssessment(){
  const unanswered=questions.filter(q=>answers[q.id]===undefined);
  if(unanswered.length){
   setError(`Please answer all ${unanswered.length} remaining question${unanswered.length===1?"":"s"}.`);
   scrollToElement(document.getElementById(`onb-q-${unanswered[0].id}`),{extra:24});
   return;
  }
  setLoading(true);setError("");
  try{
   let res:Result;
   if(browserAI){
    const details:Detail[]=questions.map(q=>{
     const selected=Number(answers[q.id]);const ok=selected===q.correct;
     return {question_id:q.id,question:q.question,competency:q.competency,options:q.options,selected,selected_text:q.options[selected]??null,is_correct:ok,answered:true,expected:q.options[q.correct!],
      why:q.explanation||"Browser-generated AI practice questions are practice-only and are not treated as independent evidence.",next:`Practice ${q.competency} and retest in the full assessment.`};
    });
    const correct=details.filter(x=>x.is_correct).length;
    res={score:Math.round(correct/questions.length*100),correct,total:questions.length,details,summary:"Browser-generated AI practice baseline. This is a practice signal only; run the full assessment to create a server-recorded assessment event.",source:"AI browser practice"};
   }else{
    const r=await api<any>("/api/v1/assessment/submit",{method:"POST",body:JSON.stringify({assessment_id:assessmentId,attempt_id:crypto.randomUUID(),answers})});
    res={...r,source:r.source||"Role-specific question bank"};
   }
   // Make sure every detail carries its question and options even if the server omitted them.
   res.details=(res.details||[]).map((d:any)=>{const q=questions.find(x=>x.id===d.question_id);return {...d,question:d.question||q?.question||"",options:d.options||q?.options||[],selected_text:d.selected_text??(q&&d.selected>=0?q.options[d.selected]:null),answered:d.answered??d.selected>=0}});
   if(browserAI){
    const buckets=new Map<string,{correct:number;total:number}>();
    for(const detail of res.details){const name=String(detail.competency||"Role fundamentals");const bucket=buckets.get(name)||{correct:0,total:0};bucket.total+=1;bucket.correct+=detail.is_correct?1:0;buckets.set(name,bucket)}
    try{const saved=await api<any>("/api/v1/practice/record-result",{method:"POST",body:JSON.stringify({source:"browser-ai-practice",title:`${role} onboarding baseline`,assessment_id:assessmentId,role,correct:res.correct,total:res.total,competency_scores:Array.from(buckets.entries()).map(([competency,v])=>({competency,score:Math.round(v.correct/v.total*100),answered:v.total,total:v.total}))})});res.role_progress=saved.role_progress;res.progress_saved=true;res.summary="This is browser-generated practice, stored as an unverified low-weight baseline. It now appears in Dashboard and Analytics. Complete a canonical assessment and attach project artifacts for stronger evidence.";setNotice("Your onboarding assessment was saved to Dashboard, Analytics and role progress as an unverified practice baseline.")}catch(saveError:any){setNotice(`Your result is shown here, but could not be saved to Analytics: ${saveError.message||"workspace save failed"}`)}
   }else{res.progress_saved=true;}
   try{const rr=await api<any>("/api/v1/resources");setResources(rr.items||[])}catch{setResources([])}
   setResult(res);setStep(3);
  }catch(e:any){setError(e.message||"Assessment could not be submitted.")}
  finally{setLoading(false)}
 }

 const gaps=useMemo(()=>(result?.details||[]).filter(x=>!x.is_correct).map(x=>x.competency).filter((x,i,a)=>a.indexOf(x)===i).slice(0,6),[result]);
 const strengths=useMemo(()=>(result?.details||[]).filter(x=>x.is_correct).map(x=>x.competency).filter((x,i,a)=>a.indexOf(x)===i).slice(0,6),[result]);
 const suggested=useMemo(()=>rankResources(resources,role,gaps).slice(0,6),[resources,role,gaps]);
 const answeredCount=questions.filter(q=>answers[q.id]!==undefined).length;
 const pct=result?.score??0;
 const verdict=pct>=70?"Solid baseline":pct>=40?"Developing baseline":"Early baseline";

 return <AppLayout><div className="page onboarding-page">
  <div className="page-head"><div><div className="eyebrow">TARGET ROLE · FRESH JOURNEY</div><h1>Start with what you want to prove.</h1><p>Choose a target role, answer questions written for that role, then build evidence and learning around it. Changing roles preserves your existing work and history.</p></div><button type="button" className="button" onClick={()=>router.push("/dashboard")}>Back to dashboard</button></div>
  <ol className="onboarding-steps" aria-label="Progress">{["01 Target role","02 Role questions","03 Results & next actions"].map((label,i)=><li key={label} className={step>=i+1?"active":""} aria-current={step===i+1?"step":undefined}>{label}</li>)}</ol>
  {error&&<div className="notice error" role="alert">{error}</div>}
  {notice&&<div className="notice" role="status">{notice}</div>}

  {step===1&&<section className="onboard-card panel" id="onboarding-current">
   <div className="onboard-intro"><div className="onboard-icon"><Target/></div><div><div className="eyebrow">TARGET ROLE</div><h2>What role are you preparing for?</h2><p>This target becomes the reference point for your questions, evidence requirements and learning recommendations.</p></div></div>
   <div className="form-grid onboarding-fields">
    <div className="field"><label htmlFor="onb-exp">EXPERIENCE LEVEL</label><select id="onb-exp" value={experience} onChange={e=>setExperience(e.target.value)}><option>Early career</option><option>Intermediate</option><option>Experienced</option></select></div>
    <div className="field"><label htmlFor="onb-goal">PRIMARY GOAL</label><input id="onb-goal" value={goal} maxLength={300} onChange={e=>setGoal(e.target.value)}/></div>
   </div>
   <p className="muted role-start-hint">Select any role below to save it and start its assessment automatically.</p>
   <div className="role-grid" role="radiogroup" aria-label="Target role" aria-busy={loading}>{roles.map(r=><button type="button" role="radio" aria-checked={role===r} className={`role-choice ${role===r?"selected":""}`} key={r} onClick={()=>void chooseRole(r)} disabled={loading}><b>{r}</b><small>{loading&&role===r?"Saving target and preparing questions…":role===r?"Selected target · click to start again":"Choose this role and start its assessment"}</small></button>)}</div>
  </section>}

  {step===2&&<section ref={assessmentSectionRef} className="panel onboarding-assessment-panel" id="onboarding-current" style={{scrollMarginTop:88}}>
   <div className="onboard-intro"><div className="onboard-icon"><BrainCircuit/></div><div><div className="eyebrow">ROLE QUESTIONS · {role.toUpperCase()}</div><h2>Show what you can actually do as a {role}.</h2><p>These questions are generated or selected for <b>{role}</b> only. Your answers become baseline practice evidence; they are not a claim that you are job-ready.</p></div></div>
   {loading&&!questions.length?<div className="empty" role="status">Preparing your {role} questions…</div>:
    <div className="question-stack">{questions.map((q,i)=><article ref={i===0?firstQuestionRef:null} className="question-card" id={`onb-q-${q.id}`} key={q.id} style={{scrollMarginTop:96}}>
     <div className="question-meta"><span>Q{i+1}</span><span>{q.competency}</span><span>{q.difficulty}</span></div>
     <h3>{q.question}</h3>
     <div className="option-grid" role="radiogroup" aria-label={`Question ${i+1}`}>{q.options.map((o,j)=><button type="button" role="radio" aria-checked={answers[q.id]===String(j)} className={answers[q.id]===String(j)?"option selected":"option"} key={`${q.id}-${j}`} onClick={()=>pick(q,j,i)}><span>{String.fromCharCode(65+j)}</span>{o}</button>)}</div>{answers[q.id]!==undefined&&<p className="onboarding-answer-status" role="status">Option {String.fromCharCode(65+Number(answers[q.id]))} selected.{i<questions.length-1?` Moving to question ${i+2}.`:" All questions are ready to submit."}</p>}
    </article>)}</div>}
   {questions.length>0&&<div className="progress-pill" role="status">{answeredCount} of {questions.length} answered</div>}
   <div className="action-row"><button type="button" className="button" onClick={returnToRolePicker}><ArrowLeft size={15}/> Change target</button>{error&&!questions.length&&<button type="button" className="button" onClick={()=>{setError("");setAttemptedRole("");void loadQuestions(role)}} disabled={loading}><RotateCcw size={14}/> Retry questions</button>}<button type="button" className="button primary" disabled={loading||!questions.length} id="onb-submit-assessment" onClick={submitAssessment}>{loading?"Analyzing your answers…":"See my results"}<ArrowRight size={15}/></button></div>
  </section>}

  {step===3&&result&&<>
   <section className="grid grid-3" id="onboarding-result" ref={resultRef} tabIndex={-1} aria-live="polite">
    <article className="metric-card onboarding-result"><span className="eyebrow">{result.source||"OVERALL COMPETENCY BASELINE"}</span><strong>{result.score}%</strong><small>{result.correct} of {result.total} questions answered correctly · {verdict}</small></article>
    <article className="metric-card"><span className="eyebrow">GAPS DETECTED</span><strong>{gaps.length}</strong><small>Competency areas needing more evidence</small></article>
    <article className="metric-card"><span className="eyebrow">TARGET</span><strong style={{fontSize:22}}>{role}</strong><small>Your roadmap is anchored to this role</small></article>
   </section>
   {result.role_progress&&<section className="grid grid-4" style={{marginTop:16}}><article className="metric-card"><span className="eyebrow">ROLE PROGRESS</span><strong>{result.role_progress.score==null?"0%":`${result.role_progress.score}%`}</strong><small>Performance signal for {role}</small></article><article className="metric-card"><span className="eyebrow">ASSESSMENT COVERAGE</span><strong>{result.role_progress.assessment_covered_skill_count||0}/{result.role_progress.required_skill_count||0}</strong><small>{result.role_progress.assessment_coverage_percent||0}% of required skills assessed</small></article><article className="metric-card"><span className="eyebrow">OPEN SKILL GAPS</span><strong>{result.role_progress.gap_count||0}</strong><small>Out of {result.role_progress.required_skill_count||0} required skills</small></article><article className="metric-card"><span className="eyebrow">EVIDENCE ARTIFACTS</span><strong>{result.role_progress.evidence_covered_skill_count||0}/{result.role_progress.required_skill_count||0}</strong><small>Skills with inspectable project evidence</small></article></section>}
   {result.role_progress?.skills?.length>0&&<section className="panel onboarding-role-skill-breakdown" style={{marginTop:16}}><div className="panel-head"><div><div className="eyebrow">ASSESSMENT → COMPETENCY GAPS → EVIDENCE</div><h2>Where your target-role skills stand</h2><p className="muted">Every row is mapped to a required skill for {role}. An assessment signal is not the same as a project artifact.</p></div><Target/></div><div className="target-list">{result.role_progress.skills.map((skill:any)=><article className="target-evidence" key={skill.competency}><div className="target-evidence-head"><div><b>{skill.competency}</b><small>{Number(skill.assessment_answer_count)||0} answers · {Number(skill.practice_attempt_count)||0} practice attempts · {Number(skill.evidence_count)||0} artifacts · {Number(skill.claim_count)||0} claims</small></div><span className={`tag ${skill.has_signal&&Number(skill.signal_percent)>=75?'good':skill.has_signal?'blue':'warn'}`}>{skill.has_signal?`${Number(skill.signal_percent)||0}% signal`:'Not assessed'}</span></div><div className="bar" style={{marginTop:8}}><i style={{width:`${Math.max(0,Math.min(100,Number(skill.signal_percent)||0))}%`}}/></div><small>{skill.gap?'OPEN GAP · prioritize practice and a retest':skill.evidence_count>0?'Artifact evidence recorded':skill.has_signal?'Scored signal recorded · add an inspectable artifact':'No score yet · start with a targeted assessment'}</small></article>)}</div><div className="action-row" style={{marginTop:14}}><button className="button" onClick={()=>router.push('/analytics')}>Open Analytics <ArrowRight size={14}/></button><button className="button" onClick={()=>router.push('/evidence')}>Open Evidence <FileCheck2 size={14}/></button></div></section>}
   <section className="panel" style={{marginTop:16}}>
    <div className="panel-head"><div><div className="eyebrow">WHY YOU GOT THIS RESULT</div><h2>Answer review</h2><p className="muted">{result.summary}</p>{result.progress_saved&&<span className="tag good">Saved to role analytics</span>}</div><CheckCircle2/></div>
    <div className="review-list">{result.details.map((d,i)=><article key={d.question_id} className={`review-item ${d.is_correct?"ok":d.answered?"bad":"skip"}`}>
     <header><span className="review-badge">{d.is_correct?<><CheckCircle2 size={14}/> Correct</>:d.answered?<><XCircle size={14}/> Needs review</>:<><MinusCircle size={14}/> Not answered</>}</span><span className="review-comp">Q{i+1} · {d.competency}</span></header>
     <h3>{d.question}</h3>
     <dl><dt>Your answer</dt><dd>{d.selected_text??"No answer selected"}</dd>{!d.is_correct&&<><dt>Best answer</dt><dd>{d.expected}</dd></>}<dt>Why</dt><dd>{d.why}</dd>{!d.is_correct&&<><dt>Next step</dt><dd>{d.next}</dd></>}</dl>
    </article>)}</div>
   </section>
   <div className="grid grid-2" style={{marginTop:16}}>
    <section className="panel"><div className="panel-head"><div><div className="eyebrow">GAP MAP</div><h2>What to strengthen next</h2></div><FileCheck2/></div>
     {gaps.length?<div className="gap-list">{gaps.map(g=><div className="signal warn" key={g}><b>{g}</b><span>Build a concrete artifact, practice in a changed context, then re-test.</span></div>)}</div>:<div className="signal good"><b>No incorrect areas in this baseline</b><span>Continue by creating target evidence through projects, challenges and GitHub.</span></div>}
     {strengths.length>0&&<p className="muted" style={{marginTop:12}}>Practice signals so far: {strengths.join(" · ")}. These are practice signals, not verified proof.</p>}
     <div className="action-row"><button type="button" className="button primary" onClick={()=>router.push("/evidence")}>Open Claim Evidence <FileCheck2 size={14}/></button><button type="button" className="button" onClick={()=>router.push("/assessment")}>Full role assessment <ArrowRight size={14}/></button></div>
    </section>
    <section className="panel"><div className="panel-head"><div><div className="eyebrow">LEARNING MATERIALS</div><h2>Start closing the gap</h2></div><BookOpen/></div>
     <p className="muted">Matched to {role} and to the gaps above. Use them alongside projects and re-validation so learning produces evidence.</p>
     <div className="resource-list">{suggested.length?suggested.map((r:any)=><article className="resource" key={r.id}><span className="tag blue">{String(r.type||r.kind||"RESOURCE").toUpperCase()}</span><h3>{r.title}</h3><p>{r.description||r.why||r.competency}</p><a href={safeHref(r.url)} target="_blank" rel="noreferrer noopener">Open material ↗</a></article>):<div className="empty">No catalogue resources are available yet.</div>}</div>
     <div className="action-row"><button type="button" className="button" onClick={()=>router.push("/learn")}>All learning paths <ArrowRight size={14}/></button></div>
    </section>
   </div>
   <section className="panel onboarding-next"><div><div className="eyebrow">YOUR NEXT LOOP</div><h2>Claim → practice → prove → re-test</h2><p>Now that SKILLSETRA has a baseline, use Claim Evidence to connect your strongest artifacts, then use Challenges, Projects, GitHub and the Roadmap to create stronger evidence for <b>{role}</b>.</p></div><div className="action-row"><button type="button" className="button" onClick={()=>router.push("/roadmap")}>Open roadmap <ArrowRight size={14}/></button><button type="button" className="button" onClick={returnToRolePicker}>Choose a different role <Target size={14}/></button></div></section>
  </>}
 </div></AppLayout>
}
