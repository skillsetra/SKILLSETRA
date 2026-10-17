"use client";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

type Step={title:string;reason:string;href:string;label:string};
const steps:Record<string,Step>={
"/dashboard":{title:"Add concrete proof for one skill",reason:"A claim becomes useful when it is connected to work that can be reviewed.",href:"/evidence",label:"Claim Evidence"},
"/competencies":{title:"Demonstrate an unproven competency",reason:"Choose one skill and attach an artifact, repository, or assessment result.",href:"/evidence",label:"Claim Evidence"},
"/evidence":{title:"Review the evidence record",reason:"Check the review status, observed signals, and missing proof before choosing practice.",href:"/analytics",label:"View Analytics"},
"/analytics":{title:"Close your largest evidence gap",reason:"Use a concrete task or assessment to create a new, comparable signal.",href:"/assessments",label:"Take an Assessment"},
"/assessment":{title:"Review your recorded assessment",reason:"Use the result to choose a specific competency for practice or retesting.",href:"/assessments",label:"Open Assessment Studio"},
"/assessments":{title:"Build evidence from your weakest result",reason:"Practice the weak area, then retest the same competency to compare like with like.",href:"/learn",label:"Find Learning Materials"},
"/resume":{title:"Turn a reviewed resume finding into a claim",reason:"Resume statements are leads for evidence, not independent proof of mastery.",href:"/evidence",label:"Review Claim Evidence"},
"/github":{title:"Connect relevant repository signals to a claim",reason:"Explain your contribution and select specific files or commits; a public repo alone does not prove authorship.",href:"/evidence",label:"Claim Evidence"},
"/learn":{title:"practice a competency from your target role",reason:"Learning completion is activity, not proof. Create a practical signal with an assessment or artifact.",href:"/practice",label:"Open Practice"},
"/practice":{title:"Measure your current performance",reason:"Use a scored assessment after practice and preserve the result for a later comparison.",href:"/assessments",label:"Take an Assessment"},
"/challenges":{title:"Connect the challenge to a competency",reason:"Use the result to identify a skill gap and decide what to practice next.",href:"/analytics",label:"View Analytics"},
"/interview":{title:"Review weak answers and practice again",reason:"Interview feedback is a learning signal; retest the same competency before claiming improvement.",href:"/assessments",label:"Retest a Competency"},
"/projects":{title:"Document your individual contribution",reason:"A project becomes stronger evidence when your role, decisions, and inspectable artifacts are clear.",href:"/evidence",label:"Add Project Evidence"},
"/roadmap":{title:"Start the next recommended activity",reason:"Choose a resource for a real gap, then practice and retest instead of treating completion as mastery.",href:"/learn",label:"Continue Learning"},
"/career":{title:"Compare role requirements with your evidence",reason:"Select a target role, then review the competencies you can and cannot currently demonstrate.",href:"/competencies",label:"Review Competencies"},
"/profile":{title:"Review your active target role",reason:"Changing roles should update requirements without erasing previous claims or attempts.",href:"/career",label:"Explore Roles"},
"/settings":{title:"Return to your competency journey",reason:"Use your selected provider and preferences to continue collecting real evidence.",href:"/dashboard",label:"Back to Dashboard"},
"/help":{title:"Apply the guide to your own workspace",reason:"Start with one required competency and attach the strongest evidence you can inspect.",href:"/evidence",label:"Claim Evidence"},
"/contact":{title:"Return to your current journey",reason:"Continue with a claim, assessment, or learning action when you're ready.",href:"/dashboard",label:"Back to Dashboard"},
"/notifications":{title:"Act on a relevant workspace update",reason:"Open the related evidence or assessment and choose a specific next action.",href:"/dashboard",label:"Back to Dashboard"},
"/project-defense":{title:"Turn project reasoning into reviewable evidence",reason:"Record your contribution and connect the result to a competency claim.",href:"/evidence",label:"Claim Evidence"},
"/reasoning":{title:"Apply your reasoning to a competency challenge",reason:"Choose a concrete task and retain a result you can compare later.",href:"/challenges",label:"Open Challenges"},
"/interpret":{title:"Connect your interpretation to practical work",reason:"Use the insight to build, practice, or submit evidence for a specific competency.",href:"/practice",label:"Open Practice"},
"/projects/defense":{title:"Capture what you demonstrated in the defense",reason:"A defense answer is a useful signal; attach supporting artifacts to make the claim inspectable.",href:"/evidence",label:"Claim Evidence"}
};
export default function NextStep({pathname}:{pathname:string}){if(pathname==="/dashboard")return null;const step=steps[pathname]||(pathname.startsWith("/career/")?{title:"Compare this role with your current evidence",reason:"Review required competencies and submit proof for the most important gap.",href:"/competencies",label:"Review Competencies"}:undefined);if(!step)return null;return <aside className="context-next-step" aria-label="Recommended next step"><div className="context-next-icon"><Compass size={18}/></div><div className="context-next-copy"><span className="eyebrow">YOUR NEXT STEP</span><strong>{step.title}</strong><p>{step.reason}</p></div><Link href={step.href} className="context-next-action">{step.label}<ArrowRight size={15}/></Link></aside>}
