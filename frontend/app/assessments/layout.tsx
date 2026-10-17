import type {Metadata} from "next";
export const metadata:Metadata={title:'Assessment Studio',description:'Practice competency checks and review saved assessment attempts.',alternates:{canonical:"/assessments"},robots:{index:false,follow:false},openGraph:{title:'Assessment Studio',description:'Practice competency checks and review saved assessment attempts.',url:"/assessments"}};
export default function AssessmentsLayout({children}:{children:React.ReactNode}){return children}
