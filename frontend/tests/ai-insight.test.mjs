import test from "node:test";
import assert from "node:assert/strict";
import { cleanAIText, parseAIInsight } from "../lib/ai-insight.mjs";

const submittedAnswerReview = `**Evaluation of the submitted answer (“hello”)**

| Category | Assessment |
|----------|------------|
| **Strengths** | None - the response contains no relevant content. |
| **Missing Points** | • No discussion of how to preserve valid events. <br>• No strategy for isolating malformed records. <br>• No diagnostics or error-reporting mechanism described. <br>• No mention of adding failure-path tests. <br>• No explanation of the debugging path or testing plan. |
| **Risks** | The challenge’s requirements are unmet, so the solution would fail in production. <br>• Lack of diagnostics could hide future data quality issues. <br>• Without tests, regressions cannot be detected. |
| **Next Verification Step** | Request a complete, detailed solution that addresses all constraints, including code snippets or pseudocode, test strategy, and debugging steps. Ensure the response is self-contained and directly answers the challenge. |`;

test("parses AI evaluation tables into usable visual categories", () => {
  const result = parseAIInsight(submittedAnswerReview);
  assert.match(result.title, /Evaluation of the submitted answer/);
  assert.deepEqual(result.sections.map((section) => section.title), ["Strengths", "Missing points", "Risks", "Next verification step"]);
  assert.equal(result.sections[1].items.length, 5);
  assert.equal(result.sections[2].items.length, 3);
  assert.equal(result.sections[3].items.length, 2);
  assert.equal(result.sections[0].kind, "good");
  assert.equal(result.sections[1].kind, "warn");
  assert.equal(result.sections[2].kind, "risk");
  assert.equal(result.sections[3].kind, "next");
});

test("removes raw Markdown separators, emphasis and HTML line break syntax", () => {
  const text = cleanAIText("**Key point**\n----\nNo tests. <br>• No diagnostics.");
  assert.equal(text.includes("**"), false);
  assert.equal(text.includes("----"), false);
  assert.equal(text.toLowerCase().includes("<br"), false);
  assert.match(text, /Key point/);
  assert.match(text, /No diagnostics/);
});

test("handles regular labeled sections and bullet lists", () => {
  const result = parseAIInsight("**Strengths**\n- Correctly identifies the database connection pool.\n\n**Risks**: No backpressure during retry spikes.\n\n**Next steps**: Add a load test.");
  assert.ok(result.sections.some((section) => section.kind === "good" && section.items.some((item) => /connection pool/.test(item))));
  assert.ok(result.sections.some((section) => section.kind === "risk" && section.items.some((item) => /backpressure/.test(item))));
  assert.ok(result.sections.some((section) => section.kind === "next" && section.items.some((item) => /load test/.test(item))));
});

test("never returns an empty display model for an empty answer", () => {
  const result = parseAIInsight("");
  assert.equal(result.sections.length, 1);
  assert.ok(result.sections[0].items[0]);
});
