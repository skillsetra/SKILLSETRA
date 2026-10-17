import type {Metadata} from "next";
export const metadata:Metadata={title:'Your Profile',description:'Manage your SKILLSETRA profile and competency context.',alternates:{canonical:"/profile"},robots:{index:false,follow:false},openGraph:{title:'Your Profile',description:'Manage your SKILLSETRA profile and competency context.',url:"/profile"}};
export default function ProfileLayout({children}:{children:React.ReactNode}){return children}
