import type {Metadata} from "next";
export const metadata:Metadata={title:'Progress Analytics',description:'Review saved competency signals, assessment attempts and challenge history.',alternates:{canonical:"/analytics"},robots:{index:false,follow:false},openGraph:{title:'Progress Analytics',description:'Review saved competency signals, assessment attempts and challenge history.',url:"/analytics"}};
export default function AnalyticsLayout({children}:{children:React.ReactNode}){return children}
