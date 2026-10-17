import {createHash,createHmac,timingSafeEqual} from "node:crypto";

export const ADMIN_COOKIE_NAME="skillsetra_admin_session";
export const ADMIN_COOKIE_PATH="/admin";
export const ADMIN_SESSION_SECONDS=8*60*60;
type AdminPayload={username:string;expiresAt:number};
type AdminConfig={username:string;password:string;secret:string};

export function getAdminConfig():AdminConfig|null{
 const username=(process.env.ADMIN_USERNAME||"").trim();
 const password=process.env.ADMIN_PASSWORD||"";
 const secret=process.env.ADMIN_SESSION_SECRET||"";
 if(!username||password.length<12||secret.length<32)return null;
 if(username.length>160||password.length>1024)return null;
 return {username,password,secret};
}
function digest(value:string){return createHash("sha256").update(value,"utf8").digest()}
export function constantTimeTextEqual(a:string,b:string){return timingSafeEqual(digest(a),digest(b))}
function signingKey(config:AdminConfig){return createHash("sha256").update(config.secret).update("\0").update(config.password).digest()}
export function verifyAdminCredentials(username:string,password:string):boolean{
 const config=getAdminConfig();if(!config||!username||!password)return false;
 return constantTimeTextEqual(username.trim(),config.username)&&constantTimeTextEqual(password,config.password);
}
export function createAdminSessionToken(username:string,now=Date.now()):string{
 const config=getAdminConfig();if(!config)throw new Error("Admin sign-in is not configured.");
 const payload:AdminPayload={username:config.username,expiresAt:Math.floor(now/1000)+ADMIN_SESSION_SECONDS};
 const encoded=Buffer.from(JSON.stringify(payload)).toString("base64url");
 const signature=createHmac("sha256",signingKey(config)).update(encoded).digest("base64url");
 return `${encoded}.${signature}`;
}
export function verifyAdminSessionToken(token:string|undefined|null,now=Date.now()):boolean{
 const config=getAdminConfig();if(!config||!token||token.length>2048)return false;
 const parts=token.split(".");if(parts.length!==2||!parts[0]||!parts[1])return false;
 try{
  const expected=createHmac("sha256",signingKey(config)).update(parts[0]).digest();
  const supplied=Buffer.from(parts[1],"base64url");
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return false;
  const payload=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8")) as AdminPayload;
  return Boolean(payload&&payload.username===config.username&&Number.isFinite(payload.expiresAt)&&payload.expiresAt>Math.floor(now/1000));
 }catch{return false}
}
