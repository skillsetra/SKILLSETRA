import type {Metadata} from "next";
export const metadata:Metadata={title:'Resume Analysis',description:'Review resume information and competency suggestions.',alternates:{canonical:"/resume"},robots:{index:false,follow:false},openGraph:{title:'Resume Analysis',description:'Review resume information and competency suggestions.',url:"/resume"}};
export default function ResumeLayout({children}:{children:React.ReactNode}){return children}
