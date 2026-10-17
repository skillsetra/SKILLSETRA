import {NextRequest,NextResponse} from "next/server";
import {ADMIN_COOKIE_NAME,ADMIN_COOKIE_PATH} from "../../../../lib/admin-auth";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const destination=new URL("/admin/login",request.url);
 const response=NextResponse.redirect(destination,303);
 response.cookies.set({name:ADMIN_COOKIE_NAME,value:"",httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:ADMIN_COOKIE_PATH,maxAge:0,expires:new Date(0)});
 response.headers.set("Cache-Control","no-store");
 return response;
}
