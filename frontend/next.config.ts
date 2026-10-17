import type {NextConfig} from "next";
const backendInternalUrl=(process.env.BACKEND_INTERNAL_URL||"http://127.0.0.1:8000").replace(/\/$/,"");
const isDev=process.env.NODE_ENV!=="production";
const csp=`default-src 'self'; script-src 'self' 'unsafe-inline'${isDev?" 'unsafe-eval'":""} https://js.puter.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:${isDev?" ws: http://localhost:* http://127.0.0.1:*":""}; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https:; object-src 'none'`;
const nextConfig:NextConfig={
  reactStrictMode:true,
  poweredByHeader:false,
  devIndicators:false,
  compress:true,
  async rewrites(){return [{source:"/api/v1/:path*",destination:`${backendInternalUrl}/api/v1/:path*`}]},
  async headers(){return [
    {source:"/:path*",headers:[
      ...(isDev?[]:[{key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"}]),
      {key:"Content-Security-Policy",value:csp},
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"X-Frame-Options",value:"DENY"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"Permissions-Policy",value:"camera=(), microphone=(self), geolocation=()"}
    ]},
    {source:"/skillsetra-logo.png",headers:[{key:"Cache-Control",value:"public, max-age=604800, stale-while-revalidate=86400"}]},
    {source:"/skillsetra-logo.webp",headers:[{key:"Cache-Control",value:"public, max-age=604800, stale-while-revalidate=86400"}]},
    {source:"/skillsetra-social.png",headers:[{key:"Cache-Control",value:"public, max-age=604800, stale-while-revalidate=86400"}]}
  ]}
};
export default nextConfig;
