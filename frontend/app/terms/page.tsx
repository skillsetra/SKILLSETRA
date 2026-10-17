import Link from "next/link";
import PublicPage from "../../components/PublicPage";

const sections=[
 ["01","Purpose","SKILLSETRA provides an evidence-driven learning and competency workspace. It helps users choose a target role, assess skills, find learning material, practice, record evidence and review progress. It does not guarantee employment, admission, compensation, certification or professional competence."],
 ["02","Your responsibility","You are responsible for the accuracy, legality and ownership of the content you submit. Do not submit work you are not authorized to share or represent third-party work as your own evidence."],
 ["03","Evidence integrity","A claim is not proof. Assessment performance, AI feedback, repository signals and learning completion are different evidence types and must not be presented as independent certification. The product intentionally keeps these distinctions visible."],
 ["04","AI features","AI-generated questions, answers, coaching and analysis may be incorrect or unavailable. Treat AI output as assistance, verify important technical/security/career decisions, and do not rely on an AI response as independent evidence."],
 ["05","AI and external content","Do not use SKILLSETRA to trick a model into revealing system prompts, credentials or private information. External repository, document and URL content can contain malicious instructions; the application treats such content as untrusted."],
 ["06","Acceptable use","Do not use the application to bypass access controls, attack systems, distribute malware, steal credentials, fabricate evidence, impersonate people, abuse third-party services or violate applicable law."],
 ["07","GitHub Intelligence","The current product uses public repository analysis and does not expose a GitHub account connection workflow. Only analyze repositories you are authorized to inspect and respect the repository's license and terms."],
 ["08","Availability and changes","The application is a demo-oriented build and features, providers, links, storage behavior and limits can change. Anonymous demo sessions are not secure accounts. Production operators should publish their own service availability commitments."],
 ["09","Security","Keep credentials private, use least-privilege provider credentials, and never paste secrets into evidence or chat. Report suspected security issues through the deployment's published contact channel."],
 ["10","Third parties","External providers operate under their own terms. SKILLSETRA does not control the availability, accuracy, pricing or privacy practices of third-party providers."],
 ["11","No professional advice","Product analytics and AI responses are not legal, medical, financial, security, academic or other professional advice. Obtain qualified human review where the decision is consequential."],
 ["12","Changes and contact","The applicable version is the one published by the deployment operator. Product or policy questions can be sent through the Contact page."]
];

export default function Terms(){return <PublicPage eyebrow="Terms of use" title="Use SKILLSETRA honestly, safely and with appropriate human judgment.">
<div className="legal-intro"><p>These terms describe intended use of the current application build. They are not a substitute for deployment-specific legal terms, institutional policies or professional legal advice.</p><div className="legal-meta"><span>Last reviewed: 11 October 2026</span><span>Current application build</span></div></div>
<nav className="legal-toc" aria-label="Terms sections"><strong>Terms sections</strong><div>{sections.map(([n,h])=><a key={n} href={`#terms-${n}`}>{n} · {h}</a>)}</div></nav>
<div className="legal-list">{sections.map(([n,h,p])=><section id={`terms-${n}`} className="legal-section" key={n}><div className="legal-number">{n}</div><div><h2>{h}</h2><p>{p}</p></div></section>)}</div>
<aside className="legal-callout"><b>Rule of thumb</b><span>If you would not publish it publicly or hand it to a human reviewer, do not put it into an evidence claim or AI prompt.</span></aside>
<aside className="legal-callout"><b>Related</b><span>See also the <Link href="/privacy">Privacy policy</Link>, the <Link href="/help">Help centre</Link>, or <Link href="/contact?topic=privacy">contact us about a data request</Link>.</span></aside>
</PublicPage>}
