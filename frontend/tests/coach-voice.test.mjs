import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  COACH_LANGS,
  recognitionLocales,
  normalizeUnavailableRecognitionLanguages,
  selectableRecognitionLanguages,
  recognitionErrorMessage,
  dedupeRecognitionSegments,
} from "../lib/coach-voice.mjs";

test("every advertised speech language has a primary locale and locale fallbacks", () => {
  assert.ok(Object.keys(COACH_LANGS).length >= 30);
  for (const [name, locale] of Object.entries(COACH_LANGS)) {
    assert.match(locale, /^[a-z]{2,3}-[A-Z]{2,4}$/);
    const candidates = recognitionLocales(name);
    assert.ok(candidates.includes(locale), `${name} candidates include primary locale`);
    assert.equal(new Set(candidates).size, candidates.length, `${name} candidates are unique`);
  }
});

test("unsupported language memory is validated and only excludes browser-rejected languages", () => {
  assert.deepEqual(normalizeUnavailableRecognitionLanguages(["Gujarati", "Gujarati", "Not a language", 3, null]), ["Gujarati"]);
  assert.deepEqual(normalizeUnavailableRecognitionLanguages("invalid"), []);
  const selectable = selectableRecognitionLanguages(["Gujarati", "Hindi", "bogus"]);
  assert.ok(!selectable.includes("Gujarati"));
  assert.ok(!selectable.includes("Hindi"));
  assert.ok(selectable.includes("English"));
});

test("speech-service network errors are not mislabeled as general internet failures", () => {
  const message = recognitionErrorMessage("network", "English");
  assert.match(message, /browser's speech-recognition service could not connect/i);
  assert.match(message, /even when normal internet works/i);
  assert.match(message, /continue by typing/i);
  assert.doesNotMatch(message, /check your internet connection/i);
});

test("only explicit unsupported-language errors recommend hiding a language", () => {
  assert.match(recognitionErrorMessage("language-not-supported", "Gujarati"), /will be hidden/i);
  assert.doesNotMatch(recognitionErrorMessage("network", "Gujarati"), /will be hidden/i);
  assert.match(recognitionErrorMessage("audio-capture", "English"), /microphone/i);
  assert.match(recognitionErrorMessage("not-allowed", "English"), /permission/i);
});


test("AI Coach has no redundant End Conversation header button and retains safe media cleanup", async () => {
  const source = await readFile(new URL("../components/PersistentAIWidget.tsx", import.meta.url), "utf8");
  assert.match(source, /className="ai-voice-end-button"[\s\S]{0,220}aria-label="End conversation"/);
  const header = source.slice(source.indexOf('<div className="ai-head-actions">'), source.indexOf('</div>', source.indexOf('<div className="ai-head-actions">')));
  assert.doesNotMatch(header, /End conversation/i);
  assert.match(source, /full \? exitFullscreen : enterFullscreen/);
  assert.match(source, /stopVoiceSession\(false\); setOpen\(false\)/);
  assert.match(source, /recognitionRef\.current\?\.abort\(\)/);
  assert.match(source, /window\.speechSynthesis\.cancel\(\)/);
  assert.match(source, /speechRunRef\.current\?\.\(\)/);
});

test("AI Coach keeps the voice session open after transient failures and bounds recognition retries", async () => {
  const source = await readFile(new URL("../components/PersistentAIWidget.tsx", import.meta.url), "utf8");
  assert.match(source, /className="ai-voice-typed-fallback"/);
  assert.match(source, /recognitionErrorMessage\(code, voiceLanguageRef\.current\)/);
  assert.match(source, /recognitionNetworkRetriesRef\.current < 2/);
  assert.match(source, /Speech recognition temporarily disconnected/);
  assert.match(source, /voiceSessionRef\.current\) \{[\s\S]*?Your voice conversation remains open/);
  assert.match(source, /voiceSessionRef\.current\) \{[\s\S]*?listening will resume/);
  assert.match(source, /setVoiceTextInput\(transcript\.trim\(\)\)/);
  assert.match(source, /voiceSessionRef\.current = false/); // Explicit stop/session reset still closes the session.
  assert.match(source, /if \(mode === "voice" && voiceSessionRef\.current\) stopVoiceSession\(false\)/);
});

test("voice input waits for a natural pause and does not duplicate interim hypotheses", async () => {
  const source = await readFile(new URL("../components/PersistentAIWidget.tsx", import.meta.url), "utf8");
  assert.match(source, /voiceFinalTextRef/);
  assert.match(source, /}, 2400\)/);
  assert.match(source, /would duplicate words/);
  assert.match(source, /voiceSessionRef\.current \|\| \["listening", "thinking", "speaking", "typing"\]\.includes\(voiceState\)/);
  assert.match(source, /const \[speechVolume, setSpeechVolume\] = useState\(1\)/);
});


test("AI Coach dictation rebuilds from the current result snapshot and removes repeated adjacent hypotheses", async () => {
  const source = await readFile(new URL("../components/PersistentAIWidget.tsx", import.meta.url), "utf8");
  assert.match(source, /Rebuild the transcript from that snapshot/);
  assert.match(source, /textDictationResultsRef\.current = segments/);
  assert.match(source, /dedupeRecognitionSegments\(Array\.from/);
});


test("speech recognition segments deduplicate repeated phrases even when punctuation changes", () => {
  assert.deepEqual(dedupeRecognitionSegments(["Hi, I am good", "Hi, I am good.", "How are you?", "How are you?"]), ["Hi, I am good", "How are you?"]);
});
