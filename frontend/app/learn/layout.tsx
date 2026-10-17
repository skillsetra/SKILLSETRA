import type {Metadata} from "next";
export const metadata:Metadata={title:'Learning Resources',description:'Find learning resources connected to your competency goals.',alternates:{canonical:"/learn"},robots:{index:false,follow:false},openGraph:{title:'Learning Resources',description:'Find learning resources connected to your competency goals.',url:"/learn"}};
export default function LearnLayout({children}:{children:React.ReactNode}){return children}
