"use client";
import {useEffect,useRef,useState} from "react";
import AppLayout from "../../components/AppLayout";
import {useApp} from "../../components/AppProvider";
import {api} from "../../lib/api";
import {runPuter} from "../../lib/ai";
import {scrollToElement} from "../../lib/scroll";
import AIInsight from "../../components/AIInsight";
import {GitBranch,ShieldCheck,Search,Target,CheckCircle2,Folder,FileCode2} from "lucide-react";

type RecommendedChange = {
 path:string;
 kind:"file"|"folder";
 operation:"Create"|"Review";
 reason:string;
 change:string;
};

export default function GitHub(){
 const {user}=useApp();
 const [url,setUrl]=useState("");
 const [analysis,setAnalysis]=useState<any>(null);
 const provider="puter";
 const model="openai/gpt-oss-20b";
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [analysisNotice,setAnalysisNotice]=useState("");
 const [analysisRun,setAnalysisRun]=useState(0);
 const resultRef=useRef<HTMLElement|null>(null);

 useEffect(()=>{api<any>("/api/v1/github/analysis").then(result=>{if(result?.facts)setAnalysis(result)}).catch(()=>{})},[]);
 useEffect(()=>{if(analysisRun>0&&analysis?.facts)scrollToElement(resultRef.current,{extra:22})},[analysisRun,analysis]);

 async function analyze(target:string){
  if(!target.trim()){setError("Enter a public GitHub repository URL.");return}
  setLoading(true);setError("");setAnalysisNotice("");setAnalysis(null);
  try{
   const result=await api<any>("/api/v1/github/analyze",{method:"POST",body:JSON.stringify({url:target.trim(),role:user?.targetRole||"",target_role:user?.targetRole||"",provider,model,language:"English"})});
   let notice="";
   if(result.ai?.mode==="puter-client"&&result.ai.prompt){
    try{
     result.ai.text=await runPuter(result.ai.prompt,result.ai.model||model);
     result.ai.provider="ai-service";
    }catch(e:any){
     notice=`Repository facts and the recommended change are available, but the optional AI explanation failed: ${e?.message||"AI service unavailable"}.`;
     result.ai={...result.ai,text:"",provider:"ai-service"};
    }
   }
   setUrl(target.trim());setAnalysis(result);setAnalysisNotice(notice);setAnalysisRun(value=>value+1);
  }catch(e:any){setError(e.message||"GitHub analysis failed. Check the repository URL and server connection.")}
  finally{setLoading(false)}
 }

 const recommendation=analysis?.recommended_change as RecommendedChange|undefined;
 return <AppLayout><div className="page">
  <div className="page-head"><div><div className="eyebrow">Repository intelligence</div><h1>Analyze a repository and find the next change.</h1><p>Inspect a public GitHub repository, review its structure, and get one prioritized file or folder to improve. Analysis does not create or claim learner evidence.</p></div><button className="button" onClick={()=>location.href="/onboarding?reset=1"}><Target size={14}/> Reselect role</button></div>
  <section className="panel"><div className="panel-head"><div><div className="eyebrow">PUBLIC REPOSITORY ANALYSIS</div><h2>Analyze repo</h2><p className="muted">Enter a public GitHub repository URL. The analyzer checks repository metadata and the available file tree; it does not add claims to Evidence.</p></div><GitBranch/></div>
   <div className="field"><label htmlFor="github-repository-url">REPOSITORY URL</label><div className="action-row"><input id="github-repository-url" style={{flex:1}} value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://github.com/owner/repository" onKeyDown={event=>{if(event.key==="Enter"&&!loading)void analyze(url)}}/><button className="button primary" onClick={()=>void analyze(url)} disabled={!url.trim()||loading}><Search size={13}/>{loading?"Analyzing…":"Analyze repository"}</button></div></div>
   <div className="signal good" style={{marginTop:12}}><b>Analysis only</b><span>The analyzer reports repository observations and recommends one file or folder to change. It never turns repository inspection into a skill claim.</span></div>
   {error&&<div className="notice error" role="alert" style={{marginTop:12}}>{error}</div>}
   {loading&&<div className="notice" role="status" style={{marginTop:12}}>Analyzing repository metadata and file structure…</div>}
  </section>
  {analysis?.facts&&<section ref={resultRef} id="github-analysis-results" tabIndex={-1} style={{marginTop:16,scrollMarginTop:88,outline:"none"}}>
   <div className="notice project-analysis-complete" role="status"><b><CheckCircle2 size={16}/> Repository analysis complete</b><span>{analysis.facts.repository||url} · findings and one recommended change are shown below.</span></div>
   {analysisNotice&&<div className="notice" role="status">{analysisNotice}</div>}
   <section className="panel"><div className="eyebrow">OBSERVED REPOSITORY</div><h2>{analysis.facts.repository}</h2><p className="muted">{analysis.facts.description||"No repository description provided."}</p><div className="signal-grid"><div className="signal"><span>Languages</span><b>{analysis.facts.languages?.join(", ")||"None detected"}</b></div><div className="signal"><span>Signals</span><b>{analysis.facts.signals?.join(", ")||"None detected"}</b></div><div className="signal"><span>Tests</span><b>{analysis.facts.has_tests?"Detected":"Not detected"}</b></div><div className="signal"><span>CI/CD</span><b>{analysis.facts.has_ci?"Detected":"Not detected"}</b></div></div><p className="muted" style={{marginTop:12}}>{analysis.facts.file_count} files and {analysis.facts.directory_count} directories inspected{analysis.facts.inspection_truncated?" (the repository tree was truncated by the API limit)":""}. A detected file or signal does not prove code quality or authorship.</p></section>
   {recommendation&&<section className="panel" style={{marginTop:12}}><div className="panel-head"><div><div className="eyebrow">ONE PRIORITIZED NEXT CHANGE</div><h2>{recommendation.operation} {recommendation.kind}</h2></div>{recommendation.kind==="folder"?<Folder/>:<FileCode2/>}</div><div className="claim" style={{marginTop:8}}><b style={{fontSize:14,overflowWrap:"anywhere"}}>{recommendation.path}</b><p>{recommendation.reason}</p><span className="tag">{recommendation.operation} · {recommendation.kind}</span><div style={{marginTop:12}}><b>What to change</b><p>{recommendation.change}</p></div></div><p className="muted">This is one prioritized recommendation based on the inspected repository tree and detected metadata, not a claim that the file was opened or independently verified.</p></section>}
   {analysis.ai?.text&&<section className="panel" style={{marginTop:12}}><div className="eyebrow">AI EXPLANATION OF THE SAME CHANGE</div><AIInsight text={analysis.ai.text} compact/></section>}
   <section className="panel" style={{marginTop:12}}><div className="panel-head"><div><div className="eyebrow">NEXT STEP</div><h2>Apply and verify the change in your repository</h2></div><ShieldCheck/></div><p className="muted">Use the recommended path as a starting point, make the change in your own repository, and run the relevant checks. Repository analysis alone does not create evidence or update competency claims.</p><div className="action-row"><a className="button" href={analysis.facts.url} target="_blank" rel="noreferrer">Open repository ↗</a></div></section>
  </section>}
 </div></AppLayout>
}
