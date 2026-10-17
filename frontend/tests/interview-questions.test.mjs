import test from "node:test";
import assert from "node:assert/strict";
import { ENGLISH_LEVELS, ENGLISH_QUESTION_BANK, chooseEnglishFallbackQuestion, isDuplicateQuestion, normalizeInterviewQuestion } from "../lib/interview-questions.mjs";

test("every English level contains 15 distinct fallback prompts", () => {
  assert.equal(ENGLISH_LEVELS.length, 5);
  for (const level of ENGLISH_LEVELS) {
    assert.equal(ENGLISH_QUESTION_BANK[level].length, 15, `${level} question count`);
    const normalized = ENGLISH_QUESTION_BANK[level].map(normalizeInterviewQuestion);
    assert.equal(new Set(normalized).size, 15, `${level} fallback uniqueness`);
  }
});

test("1, 3, 5, 10, and 15 question sessions do not repeat deterministic fallback prompts", () => {
  for (const level of ENGLISH_LEVELS) {
    for (const count of [1, 3, 5, 10, 15]) {
      const previous = [];
      for (let round = 1; round <= count; round += 1) {
        const question = chooseEnglishFallbackQuestion(level, round, previous);
        assert.ok(question, `${level} should have a unique prompt at round ${round}/${count}`);
        assert.equal(isDuplicateQuestion(question, previous), false, `${level} repeated at round ${round}`);
        previous.push(question);
      }
      assert.equal(previous.length, count);
    }
  }
});

test("duplicate detection normalizes punctuation, case, and a modest rewording", () => {
  assert.equal(isDuplicateQuestion("Tell me about a project you are proud of!", ["tell me about a project you are proud of."]), true);
  assert.equal(isDuplicateQuestion("Explain a project you are proud of and your contribution", ["Tell me about a project you are proud of and explain your contribution."]), true);
  assert.equal(isDuplicateQuestion("How do you prioritize several deadlines?", ["What helps you explain an unfamiliar word?"]), false);
});

test("the fallback fails closed instead of wrapping to an already-used question", () => {
  const level = "Beginner";
  const bank = ENGLISH_QUESTION_BANK[level];
  assert.equal(chooseEnglishFallbackQuestion(level, 16, bank), null);
  assert.equal(chooseEnglishFallbackQuestion(level, 1, []), bank[0]);
});

test("empty or malformed model output is not considered a duplicate", () => {
  assert.equal(isDuplicateQuestion("  !?  ", ["A real question?"]), false);
  assert.equal(chooseEnglishFallbackQuestion("Unknown level", 1, []), ENGLISH_QUESTION_BANK.Intermediate[0]);
});


test("live interviewer keeps its spoken question readable and exposes no Test Interview choice", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../app/interview/page.tsx", import.meta.url), "utf8");
  assert.match(source, /CURRENT QUESTION · READ ALONG/);
  assert.match(source, /className="interview-question-live"/);
  assert.doesNotMatch(source, /title: "Test Interview"/);
  assert.doesNotMatch(source, /Choose Live Interview or Test Interview/);
});
