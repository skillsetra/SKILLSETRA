// Only render http(s) or same-site relative links; anything else (javascript:, data:, //host) becomes undefined.
export function safeHref(value?:string|null):string|undefined{
  if(!value||typeof value!=="string")return undefined;
  const v=value.trim();
  if(/^https?:\/\//i.test(v))return v;
  if(v.startsWith("/")&&!v.startsWith("//"))return v;
  return undefined;
}
