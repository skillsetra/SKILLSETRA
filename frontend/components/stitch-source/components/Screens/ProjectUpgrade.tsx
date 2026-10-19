"use client";
import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,FolderKanban,CheckCircle2,Upload,FolderUp,FileText,Archive,X} from 'lucide-react';
import type {ScreenId} from '../../types';
import {api} from '../../../../lib/api';
import {runPuter} from '../../../../lib/ai';
import {scrollToElement} from '../../../../lib/scroll';
import AIInsight from '../../../AIInsight';

const MAX_UPLOAD_BYTES=8*1024*1024;
const provider='puter';
const model='openai/gpt-oss-20b';

export const ProjectUpgrade:React.FC<{onNavigate:(s:ScreenId)=>void}>=({onNavigate})=>{
 const [name,setName]=useState('');
 const [description,setDescription]=useState('');
 const [files,setFiles]=useState<File[]>([]);
 const [d,setD]=useState<any>();
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const resultRef=useRef<HTMLElement|null>(null);
 const [analysisRun,setAnalysisRun]=useState(0);
 const [analysisStatus,setAnalysisStatus]=useState('');
 const fileInputRef=useRef<HTMLInputElement|null>(null);
 const folderInputRef=useRef<HTMLInputElement|null>(null);
 useEffect(()=>{folderInputRef.current?.setAttribute('webkitdirectory','');folderInputRef.current?.setAttribute('directory','')},[]);
 useEffect(()=>{if(analysisRun>0&&d)scrollToElement(resultRef.current,{extra:22})},[analysisRun,d]);
 const totalBytes=files.reduce((sum,file)=>sum+file.size,0);
 function chooseFiles(event:React.ChangeEvent<HTMLInputElement>){
  const selected=Array.from(event.target.files||[]);
  if(selected.length>30){setError('Choose up to 30 files at a time.');event.target.value='';return}
  const bytes=selected.reduce((sum,file)=>sum+file.size,0);
  if(bytes>MAX_UPLOAD_BYTES){setError('Please keep the combined upload under 8 MB. A ZIP file is recommended for larger projects.');event.target.value='';return}
  setFiles(selected);setError('');
  if(!name.trim()&&selected[0])setName(selected[0].webkitRelativePath?.split('/')[0]||selected[0].name.replace(/\.[^.]+$/,''));
 }
 async function analyze(){
  if(name.trim().length<2){setError('Enter a project name.');return}
  if(!files.length&&description.trim().length<10){setError('Add a short project description or upload project files.');return}
  if(totalBytes>MAX_UPLOAD_BYTES){setError('Please keep the combined upload under 8 MB.');return}
  setLoading(true);setError('');setD(undefined);setAnalysisStatus('Analyzing your project…');
  try{
   let r:any;
   if(files.length){
    const body=new FormData();
    body.append('name',name.trim());body.append('description',description.trim());body.append('provider',provider);body.append('model',model);body.append('language','English');
    files.forEach(file=>body.append('files',file,(file as File&{webkitRelativePath?:string}).webkitRelativePath||file.name));
    r=await api<any>('/api/v1/projects/analyze-upload',{method:'POST',body});
   }else{
    r=await api<any>('/api/v1/projects/analyze',{method:'POST',body:JSON.stringify({name:name.trim(),description:description.trim(),provider,model,language:'English'})});
   }
   let aiNotice='';
   if(r.ai_provider==='puter'&&r.ai_analysis){
    try{r.ai_analysis=await runPuter(r.ai_analysis,model)}
    catch(e:any){aiNotice=`Project facts and upgrade suggestions were generated, but the optional AI narrative could not load: ${e?.message||'AI service unavailable'}.`;r.ai_analysis=''}
   }
   setD({...r,analysis_notice:aiNotice});
   setAnalysisStatus(aiNotice?'Project analysis complete · AI explanation unavailable':'Project analysis complete');
   setAnalysisRun(x=>x+1);
  }catch(e:any){setAnalysisStatus('');setError(e.message||'Project analysis could not be completed.')}finally{setLoading(false)}
 }
 return <div className="page space-y-6">
  <div className="page-head"><div><div className="eyebrow">Projects</div><h1>Turn a project into stronger evidence.</h1><p>Upload a project ZIP, choose source files, select a project folder, or describe the work. This feature only analyzes the supplied project; it never changes your target-role progress, goals, or evidence records.</p></div><button className="button" onClick={()=>onNavigate('project-defense')}>Open defense <ArrowRight size={15}/></button></div>
  <section className="panel project-upload-panel">
   <div className="form-grid"><div className="field"><label htmlFor="project-name">Project name</label><input id="project-name" value={name} onChange={e=>setName(e.target.value)} placeholder="My project"/></div><div className="field full"><label htmlFor="project-description">Description (optional when files are uploaded)</label><textarea id="project-description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="What does it do, what stack does it use, and what problem does it solve?"/></div></div>
   <div className="project-upload-actions"><button type="button" className="button" onClick={()=>fileInputRef.current?.click()}><Upload size={15}/> Choose ZIP / files</button><button type="button" className="button" onClick={()=>folderInputRef.current?.click()}><FolderUp size={15}/> Choose project folder</button><input ref={fileInputRef} className="visually-hidden" type="file" aria-label="Choose project ZIP or source files" multiple accept=".zip,.pdf,.docx,.txt,.md,.py,.js,.jsx,.ts,.tsx,.json,.html,.css,.sql,.yml,.yaml,.toml,.csv,.xml,.sh,.ps1,.go,.rs,.java,.kt,.cs,.cpp,.h,.hpp,.php,.rb,.swift,.dart" onChange={chooseFiles}/><input ref={folderInputRef} className="visually-hidden" type="file" aria-label="Choose project folder files" multiple onChange={chooseFiles}/><span className="muted">Up to 30 files · 8 MB combined · code is never executed</span></div>
   {files.length>0&&<div className="project-upload-file-list" aria-live="polite"><div className="project-upload-file-heading"><b><FileText size={15}/> {files.length} selected {files.length===1?'file':'files'}</b><span>{(totalBytes/1024/1024).toFixed(2)} MB</span><button type="button" className="button" onClick={()=>{setFiles([]);if(fileInputRef.current)fileInputRef.current.value='';if(folderInputRef.current)folderInputRef.current.value=''}}><X size={13}/> Clear</button></div><div className="project-upload-file-names">{files.slice(0,8).map((file,index)=><span key={`${file.name}-${index}`}><Archive size={12}/>{(file as File&{webkitRelativePath?:string}).webkitRelativePath||file.name}</span>)}{files.length>8&&<small>and {files.length-8} more…</small>}</div></div>}
   <div className="action-row" style={{marginTop:16}}><button className="button primary" disabled={loading||name.trim().length<2||(!files.length&&description.trim().length<10)||totalBytes>MAX_UPLOAD_BYTES} onClick={analyze}>{loading?'Analyzing project…':'Analyze project'} <ArrowRight size={15}/></button><small className="muted">Project-only review · no goal, role-progress, or evidence updates.</small></div>
  </section>
  {error&&<div className="notice error" style={{marginTop:12}} role="alert">{error}</div>}
  {d&&<section ref={resultRef} id="project-analysis-results" tabIndex={-1} style={{scrollMarginTop:88,outline:'none'}}><div className="notice project-analysis-complete" role="status"><b>✓ {analysisStatus||'Project analysis complete'}</b><span>{files.length?`${files.length} uploaded file(s) analyzed.`:'Project description analyzed.'} Results are shown below.</span></div>{d.analysis_notice&&<div className="notice" role="status">{d.analysis_notice}</div>}<section className="grid grid-3">{d.strengths?.map((x:string)=><article className="panel" key={x}><CheckCircle2 color="var(--p-success)"/><h3>{x}</h3><p className="muted">Observed or inferred from the supplied project materials.</p></article>)}</section><section className="panel"><div className="panel-head"><div><div className="eyebrow">Project review</div><h2>Suggested improvements</h2><p className="muted">Suggestions are advisory only and do not update your progress.</p></div><FolderKanban/></div><div className="grid grid-2">{(d.upgrades||[]).map((x:any)=><article className="signal" key={x.id}><span>{x.competency} · {x.difficulty}</span><b>{x.title}</b><p>{x.problem}</p><small>{x.evidence}</small></article>)}</div>{d.ai_analysis&&<div className="panel structured-block highlight" style={{marginTop:14}}><div className="eyebrow">Analysis</div><AIInsight text={d.ai_analysis} compact /></div>}{d.notice&&<div className="evaluation">{d.notice}</div>}</section></section>}
 </div>;
};
