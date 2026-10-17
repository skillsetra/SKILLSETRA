import type {Metadata} from "next";
export const metadata:Metadata={title:'Project Portfolio',description:'Organize projects and connect them to competency evidence.',alternates:{canonical:"/projects"},robots:{index:false,follow:false},openGraph:{title:'Project Portfolio',description:'Organize projects and connect them to competency evidence.',url:"/projects"}};
export default function ProjectsLayout({children}:{children:React.ReactNode}){return children}
