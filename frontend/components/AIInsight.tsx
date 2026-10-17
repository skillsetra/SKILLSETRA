import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, FileSearch,
  Lightbulb, ShieldAlert, Sparkles, Target,
} from "lucide-react";
import { parseAIInsight, type AIInsightKind } from "../lib/ai-insight.mjs";

type Props = { text: string; compact?: boolean; title?: string; visualFlow?: boolean };

const SECTION_ICON = {
  good: CheckCircle2,
  warn: Target,
  risk: ShieldAlert,
  next: ClipboardCheck,
  info: Lightbulb,
} as const;

function keyPhrase(text: string) {
  const value = text.trim();
  if (!value) return { lead: "", rest: "" };
  const known = value.match(/^(?:none\b|no(?:\s+[\w’'-]+){0,2}|lack of(?:\s+[\w’'-]+){0,1}|without(?:\s+[\w’'-]+){0,1}|missing(?:\s+[\w’'-]+){0,1}|critical(?:\s+[\w’'-]+){0,1}|must(?:\s+[\w’'-]+){0,1}|should(?:\s+[\w’'-]+){0,1}|next(?:\s+[\w’'-]+){0,1}|verify(?:\s+[\w’'-]+){0,1}|test(?:\s+[\w’'-]+){0,1}|ensure(?:\s+[\w’'-]+){0,1})/i);
  if (known) return { lead: known[0], rest: value.slice(known[0].length) };
  const punctuation = value.search(/[:—–]/);
  if (punctuation > 2 && punctuation < 42) return { lead: value.slice(0, punctuation), rest: value.slice(punctuation) };
  const words = value.split(/\s+/);
  if (words.length < 3) return { lead: value, rest: "" };
  const count = Math.min(words.length > 5 ? 3 : 2, words.length - 1);
  const lead = words.slice(0, count).join(" ");
  return { lead, rest: value.slice(lead.length) };
}

function emphasizedText(text: string, kind: AIInsightKind) {
  const { lead, rest } = keyPhrase(text);
  if (!lead) return text;
  return <>{<span className={`ai-insight-emphasis ${kind === "good" ? "positive" : kind === "next" ? "action" : "critical"}`}>{lead}</span>}{rest}</>;
}

function isEmptyStatement(item: string) {
  return /^(?:none\b|no (?:relevant content|strengths?|gaps?|risks?|issues?|points?|recommendations?)\b|not (?:identified|provided|available)\b|n\/a\b)/i.test(item.trim());
}

function emptySectionLabel(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("strength")) return "No strengths identified in this response.";
  if (normalized.includes("risk")) return "No risks identified in this response.";
  if (normalized.includes("gap") || normalized.includes("missing")) return "No missing points identified in this response.";
  if (normalized.includes("next") || normalized.includes("verification")) return "No next step was provided.";
  return "No specific points were identified in this section.";
}

function actualCount(items: string[]) {
  if (!items.length || items.every((item) => /^(?:none|no (?:relevant content|strengths?|gaps?|risks?|issues?|points?|recommendations?)|not (?:identified|provided|available)|n\/a)\b/i.test(item.trim()))) return 0;
  return items.length;
}

export default function AIInsight({ text, compact = false, title, visualFlow = false }: Props) {
  const data = parseAIInsight(text);
  const metrics = [
    { label: "Strengths", kind: "good" as const, Icon: CheckCircle2 },
    { label: "Gaps", kind: "warn" as const, Icon: Target },
    { label: "Risks", kind: "risk" as const, Icon: AlertTriangle },
    { label: "Next steps", kind: "next" as const, Icon: ArrowRight },
  ].map((metric) => {
    const related = data.sections.filter((section) => section.kind === metric.kind);
    return { ...metric, present: related.length > 0, count: related.reduce((sum, section) => sum + actualCount(section.items), 0) };
  }).filter((metric) => metric.present);

  return <section className={`ai-insight ${compact ? "compact" : ""}`} aria-label="Formatted AI response">
    <header className="ai-insight-header">
      <span className="ai-insight-brand-icon"><Sparkles aria-hidden="true" /></span>
      <div className="ai-insight-heading-copy"><small>AI INSIGHT</small><h3>{title || data.title || "AI answer"}</h3></div>
      <span className="ai-insight-format-label"><Activity size={13} aria-hidden="true"/> Structured review</span>
    </header>
    {metrics.length > 0 && <div className="ai-insight-metrics" aria-label="Response overview">
      {metrics.map(({ label, kind, Icon, count }) => <div className={`ai-insight-metric ${kind}`} key={label}>
        <span className="ai-insight-metric-icon"><Icon aria-hidden="true" /></span><span className="ai-insight-metric-copy"><small>{label}</small><b>{count}</b></span>
      </div>)}
    </div>}
    {visualFlow && data.sections.length > 0 && <div className="ai-insight-flow" aria-label="Visual analysis map">
      <div className="ai-insight-flow-heading"><b>ANALYSIS MAP</b><span>Key findings at a glance</span></div>
      <div className="ai-insight-flow-steps">
        {data.sections.slice(0, 6).map((section, index) => {
          const Icon = SECTION_ICON[section.kind] || FileSearch;
          const count = actualCount(section.items);
          return <div className={`ai-insight-flow-step ${section.kind}`} key={`${section.title}-${index}`}>
            <span className="ai-insight-flow-number">{index + 1}</span>
            <span className="ai-insight-flow-icon"><Icon aria-hidden="true" /></span>
            <span className="ai-insight-flow-copy"><b>{section.title}</b><small>{count} {count === 1 ? "point" : "points"}</small></span>
          </div>;
        })}
      </div>
    </div>}
    <div className="ai-insight-grid">
      {data.sections.map((section, index) => {
        const Icon = SECTION_ICON[section.kind] || FileSearch;
        return <article className={`ai-insight-card ${section.kind}`} key={`${section.title}-${index}`}>
          <header><span className="ai-insight-card-icon"><Icon aria-hidden="true" /></span><h4>{section.title}</h4><span className="ai-insight-card-count">{actualCount(section.items)} {actualCount(section.items) === 1 ? "point" : "points"}</span></header>
          <div className="ai-insight-points">
            {section.items.every(isEmptyStatement)
              ? <div className="ai-insight-empty-state"><span aria-hidden="true">✓</span><p>{emptySectionLabel(section.title)}</p></div>
              : section.items.filter((item) => !isEmptyStatement(item)).map((item, pointIndex) => <div className="ai-insight-point" key={`${pointIndex}-${item.slice(0, 24)}`}>
                <span className="ai-insight-point-number">{pointIndex + 1}</span><p>{emphasizedText(item, section.kind)}</p>
              </div>)}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
