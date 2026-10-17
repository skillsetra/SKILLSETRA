const LABELS = [
  { title: "Strengths", kind: "good", re: /^(?:strengths?|what went well|positive points?)\b/i },
  { title: "Missing points", kind: "warn", re: /^(?:missing points?|gaps?|weaknesses|areas? to improve|omissions?)\b/i },
  { title: "Risks", kind: "risk", re: /^(?:risks?|concerns?|failure modes?|threats?)\b/i },
  { title: "Next verification step", kind: "next", re: /^(?:next verification steps?|next steps?|recommended actions?|recommendations?|action plan|to do)\b/i },
  { title: "Evidence", kind: "info", re: /^(?:observed evidence|evidence|observations?|assessment|evaluation|result|findings?)\b/i },
  { title: "Summary", kind: "info", re: /^(?:summary|overview|key takeaway|conclusion|answer)\b/i },
  { title: "Root cause", kind: "info", re: /^(?:root cause|causal chain|cause)\b/i },
  { title: "Verification", kind: "next", re: /^(?:verification|tests?|validation|debugging steps?)\b/i },
];

function decodeEntities(value) {
  return String(value ?? "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

export function cleanAIText(value) {
  return decodeEntities(String(value ?? ""))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|li|ul|ol|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/__(.*?)__/gs, "$1")
    .replace(/~~(.*?)~~/gs, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripCell(value) {
  return cleanAIText(value).replace(/^\s*[|]+|[|]+\s*$/g, "").trim();
}

function labelFor(value) {
  const cleaned = stripCell(value).replace(/^[-*•\d.)\s]+/, "").trim();
  return LABELS.find((entry) => entry.re.test(cleaned));
}

function splitItems(body) {
  const prepared = cleanAIText(body)
    .replace(/[ \t]*(?:•|●|▪|◦|‣)[ \t]*/g, "\n")
    .replace(/\s+\b(?:<br\s*\/?>)+\s*/gi, "\n");
  const lines = prepared.split(/\n|\s*;\s*/).map((line) => line
    .replace(/^\s*(?:[-*•●▪◦‣]+|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ").trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  const only = lines[0] || "No detail was returned.";
  if (only.length > 190) {
    const sentences = only.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [];
    if (sentences.length > 1) return sentences;
  }
  return [only];
}

function countableItems(section) {
  if (!section.items.length) return 0;
  if (section.items.every((item) => /^(?:none|no (?:relevant content|strengths?|gaps?|risks?|issues?|points?|recommendations?)|not (?:identified|provided|available)|n\/a)\b/i.test(item.trim()))) return 0;
  return section.items.length;
}

function parseTable(lines) {
  const sections = [];
  let title = "";
  let tableStarted = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isTableRow = line.startsWith("|") && line.includes("|");
    if (!isTableRow) {
      if (!tableStarted && !title) title = stripCell(line).replace(/^['“”\"]+|['“”\"]+$/g, "");
      continue;
    }
    tableStarted = true;
    const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(stripCell);
    if (cells.length < 2) continue;
    if (/^(?:category|type|area|section)$/i.test(cells[0]) && /^(?:assessment|details?|description|finding|result|notes?)$/i.test(cells[1])) continue;
    if (/^:?-{2,}:?$/.test(cells[0]) || /^:?-{2,}:?$/.test(cells[1])) continue;
    const label = labelFor(cells[0]);
    const sectionTitle = label?.title || cells[0].replace(/^\*+|\*+$/g, "").trim();
    const kind = label?.kind || "info";
    const body = cells.slice(1).join(" ").trim();
    if (sectionTitle && body) sections.push({ title: sectionTitle, kind, items: splitItems(body) });
  }
  if (sections.length) return { title: title || "AI answer review", sections };
  return null;
}

function parseLabeledLines(lines, initialTitle) {
  const sections = [];
  let current = null;
  let title = initialTitle || "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^\s*\|?\s*:?-{2,}/.test(line) || /^[-*_]{3,}$/.test(line)) continue;
    if (line.startsWith("|") && line.includes("|")) continue;
    const cleaned = stripCell(line).replace(/^\s*[-*•]+\s*/, "");
    const label = labelFor(cleaned);
    if (label) {
      let rest = cleaned.replace(label.re, "").replace(/^[\s:|—–-]+/, "").trim();
      current = { title: label.title, kind: label.kind, items: [] };
      sections.push(current);
      if (rest) current.items.push(...splitItems(rest));
      continue;
    }
    const markdownHeading = /^#{1,4}\s+/.test(line);
    if (markdownHeading) {
      const heading = stripCell(line.replace(/^#{1,4}\s+/, ""));
      if (!title && !sections.length) { title = heading; continue; }
      current = { title: heading, kind: "info", items: [] };
      sections.push(current);
      continue;
    }
    if (current) current.items.push(...splitItems(cleaned));
    else {
      if (!title && cleaned.length < 105 && !/[.!?]$/.test(cleaned) && !/^\d+[.)]/.test(cleaned)) title = cleaned;
      else {
        current = { title: "Key points", kind: "info", items: [] };
        sections.push(current);
        current.items.push(...splitItems(cleaned));
      }
    }
  }
  for (const section of sections) section.items = section.items.filter(Boolean);
  return sections.length ? { title: title || "AI answer", sections } : null;
}

export function parseAIInsight(value) {
  const raw = decodeEntities(String(value ?? "")).replace(/\r\n?/g, "\n");
  const lines = raw.split("\n");
  const table = parseTable(lines);
  if (table) {
    table.sections = table.sections.map((section) => ({ ...section, items: section.items.length ? section.items : ["No detail was returned."] }));
    return table;
  }
  const normalized = raw.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|div|tr|li|ul|ol|h[1-6])\s*>/gi, "\n");
  const parsed = parseLabeledLines(normalized.split("\n"), "");
  if (parsed) {
    parsed.sections = parsed.sections.map((section) => ({ ...section, items: section.items.length ? section.items : ["No detail was returned."] }));
    return parsed;
  }
  const cleaned = cleanAIText(raw);
  if (!cleaned) return { title: "AI answer", sections: [{ title: "Response", kind: "info", items: ["No readable response was returned."] }] };
  const paragraphs = cleaned.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  let title = "AI answer";
  if (paragraphs[0] && paragraphs[0].length <= 100 && !/[.!?]$/.test(paragraphs[0]) && paragraphs.length > 1) title = paragraphs.shift();
  const sections = paragraphs.map((paragraph, index) => ({
    title: paragraphs.length > 1 ? (index === 0 ? "Overview" : `Key point ${index + 1}`) : "Response",
    kind: "info",
    items: splitItems(paragraph),
  }));
  return { title, sections: sections.length ? sections : [{ title: "Response", kind: "info", items: splitItems(cleaned) }] };
}
