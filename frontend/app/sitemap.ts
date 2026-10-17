import type {MetadataRoute} from "next";
import {SITE_URL} from "../lib/site";
const base=SITE_URL;
export default function sitemap():MetadataRoute.Sitemap {
  const now=new Date();
  return [
    {url:`${base}/`,lastModified:now,changeFrequency:"weekly",priority:1},
    {url:`${base}/features`,lastModified:now,changeFrequency:"monthly",priority:0.8},
    {url:`${base}/how-it-works`,lastModified:now,changeFrequency:"monthly",priority:0.8},
    {url:`${base}/about`,lastModified:now,changeFrequency:"monthly",priority:0.6},
    {url:`${base}/help`,lastModified:now,changeFrequency:"monthly",priority:0.5},
    {url:`${base}/privacy`,lastModified:now,changeFrequency:"yearly",priority:0.3},
    {url:`${base}/terms`,lastModified:now,changeFrequency:"yearly",priority:0.3},
    {url:`${base}/contact`,lastModified:now,changeFrequency:"yearly",priority:0.4}
  ];
}
