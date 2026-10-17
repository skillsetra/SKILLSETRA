export default function ProgressBar({value,status}:{value:number;status?:string}){
 return <div className="progress-wrap"><div className="progress-track"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>{status&&<span>{status}</span>}</div>
}
