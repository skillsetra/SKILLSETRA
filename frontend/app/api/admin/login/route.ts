import {NextRequest,NextResponse} from "next/server";
import {ADMIN_COOKIE_NAME,ADMIN_COOKIE_PATH,ADMIN_SESSION_SECONDS,createAdminSessionToken,getAdminConfig,verifyAdminCredentials} from "../../../../lib/admin-auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";

const attemptWindows=new Map<string,{startedAt:number;count:number}>();
function allowAttempt(key:string,now=Date.now()):boolean{
 const existing=attemptWindows.get(key);
 if(!existing||now-existing.startedAt>=15*60*1000){attemptWindows.set(key,{startedAt:now,count:1});return true}
 existing.count+=1;
 if(attemptWindows.size>3000){for(const [k,v] of attemptWindows)if(now-v.startedAt>=15*60*1000)attemptWindows.delete(k)}
 return existing.count<=8;
}
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin");
 // Render/Vercel can terminate TLS and forward the request internally, so
 // request.url is not always the public browser origin. Validate against the
 // public host/origin instead of rejecting legitimate proxied admin logins.
 if(origin){
  try{
   const originUrl=new URL(origin);
   const forwardedHost=(request.headers.get("x-forwarded-host")||request.headers.get("host")||"").split(",")[0].trim().toLowerCase();
   const configuredOrigins=(process.env.NEXT_PUBLIC_SITE_URL||"").split(",").map(value=>{try{return new URL(value.trim()).origin.toLowerCase()}catch{return ""}}).filter(Boolean);
   const samePublicHost=forwardedHost && originUrl.host.toLowerCase()===forwardedHost;
   const configuredMatch=configuredOrigins.includes(originUrl.origin.toLowerCase());
   if(!samePublicHost && !configuredMatch)return NextResponse.json({error:"Invalid request origin."},{status:403});
  }catch{return NextResponse.json({error:"Invalid request origin."},{status:403})}
 }
 if(!getAdminConfig())return NextResponse.json({error:"Admin sign-in is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD (12+ characters), and ADMIN_SESSION_SECRET (32+ characters) as server-side environment variables."},{status:503,headers:{"Cache-Control":"no-store"}});
 const ip=(request.headers.get("x-real-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").trim().slice(0,100);
 if(!allowAttempt(ip))return NextResponse.json({error:"Too many sign-in attempts. Wait 15 minutes and try again."},{status:429,headers:{"Cache-Control":"no-store","Retry-After":"900"}});
 let body:any;
 try{body=await request.json()}catch{return NextResponse.json({error:"Enter your username and password."},{status:400,headers:{"Cache-Control":"no-store"}})}
 const username=typeof body?.username==="string"?body.username.slice(0,161):"";
 const password=typeof body?.password==="string"?body.password.slice(0,1025):"";
 if(!verifyAdminCredentials(username,password))return NextResponse.json({error:"Invalid username or password."},{status:401,headers:{"Cache-Control":"no-store"}});
 attemptWindows.delete(ip);
 const token=createAdminSessionToken(username);
 const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store","Pragma":"no-cache"}});
 response.cookies.set({name:ADMIN_COOKIE_NAME,value:token,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:ADMIN_COOKIE_PATH,maxAge:ADMIN_SESSION_SECONDS});
 return response;
}
