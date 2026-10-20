/** Browser-voice capabilities shared by the AI Coach and its regression tests. */
export const COACH_LANGS = Object.freeze({
  English: "en-IN", Hindi: "hi-IN", Gujarati: "gu-IN", Marathi: "mr-IN", Bengali: "bn-IN",
  Tamil: "ta-IN", Telugu: "te-IN", Kannada: "kn-IN", Malayalam: "ml-IN", Punjabi: "pa-IN",
  Urdu: "ur-PK", Nepali: "ne-NP", Odia: "or-IN", Assamese: "as-IN", Sanskrit: "sa-IN",
  Spanish: "es-ES", French: "fr-FR", German: "de-DE", Portuguese: "pt-BR", Italian: "it-IT",
  Dutch: "nl-NL", Russian: "ru-RU", Ukrainian: "uk-UA", Turkish: "tr-TR", Arabic: "ar-SA",
  Chinese: "zh-CN", Japanese: "ja-JP", Korean: "ko-KR", Indonesian: "id-ID", Thai: "th-TH",
  Vietnamese: "vi-VN", Polish: "pl-PL", Swedish: "sv-SE", Greek: "el-GR", Hebrew: "he-IL",
});

const LOCALE_ALTERNATES = Object.freeze({
  English: ["en-IN", "en-US", "en-GB", "en-AU", "en"], Hindi: ["hi-IN", "hi"], Gujarati: ["gu-IN", "gu"],
  Marathi: ["mr-IN", "mr"], Bengali: ["bn-IN", "bn-BD", "bn"], Tamil: ["ta-IN", "ta-LK", "ta"],
  Telugu: ["te-IN", "te"], Kannada: ["kn-IN", "kn"], Malayalam: ["ml-IN", "ml"], Punjabi: ["pa-IN", "pa-Guru-IN", "pa"],
  Urdu: ["ur-PK", "ur-IN", "ur"], Nepali: ["ne-NP", "ne"], Odia: ["or-IN", "or"], Assamese: ["as-IN", "as"], Sanskrit: ["sa-IN", "sa"],
  Spanish: ["es-ES", "es-MX", "es-US", "es"], French: ["fr-FR", "fr-CA", "fr"], German: ["de-DE", "de-AT", "de"],
  Portuguese: ["pt-BR", "pt-PT", "pt"], Italian: ["it-IT", "it"], Dutch: ["nl-NL", "nl-BE", "nl"], Russian: ["ru-RU", "ru"],
  Ukrainian: ["uk-UA", "uk"], Turkish: ["tr-TR", "tr"], Arabic: ["ar-SA", "ar-EG", "ar"], Chinese: ["zh-CN", "zh-TW", "zh"],
  Japanese: ["ja-JP", "ja"], Korean: ["ko-KR", "ko"], Indonesian: ["id-ID", "id"], Thai: ["th-TH", "th"],
  Vietnamese: ["vi-VN", "vi"], Polish: ["pl-PL", "pl"], Swedish: ["sv-SE", "sv"], Greek: ["el-GR", "el"], Hebrew: ["he-IL", "he"],
});


/**
 * Removes repeated or overlapping adjacent speech-recognition segments.
 * SpeechRecognition may expose the same phrase in consecutive finalized results;
 * segments are normalized only for comparison, while the displayed wording is kept.
 */
export function dedupeRecognitionSegments(values = []) {
  const output = [];
  const normalize = value => String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const words = value => String(value || "").trim().split(/\s+/).filter(Boolean);
  const wordKey = value => normalize(value);

  // Some speech engines occasionally return one whole sentence twice inside a
  // single segment. Collapse adjacent repeated phrases of at least three words,
  // while leaving short natural repetitions (e.g. "no, no") untouched.
  const collapseInsideSegment = value => {
    let tokens = words(value);
    let changed = true;
    while (changed && tokens.length >= 6) {
      changed = false;
      const keys = tokens.map(wordKey);
      for (let i = 0; i < keys.length && !changed; i++) {
        const max = Math.floor((keys.length - i) / 2);
        for (let size = max; size >= 3; size--) {
          const first = keys.slice(i, i + size).join(" ");
          const second = keys.slice(i + size, i + size * 2).join(" ");
          if (first && first === second) {
            tokens.splice(i + size, size);
            changed = true;
            break;
          }
        }
      }
    }
    return tokens.join(" ");
  };

  for (const value of Array.from(values || [])) {
    const segment = collapseInsideSegment(String(value || "").trim());
    if (!segment) continue;
    if (!output.length) { output.push(segment); continue; }

    const previous = output[output.length - 1];
    const previousKey = normalize(previous);
    const segmentKey = normalize(segment);
    if (!segmentKey || previousKey === segmentKey) continue;

    const previousWords = words(previous);
    const segmentWords = words(segment);
    const previousKeys = previousWords.map(wordKey);
    const segmentKeys = segmentWords.map(wordKey);

    // One event may replay the full previous phrase followed by new words. Only
    // replace the repeated prefix if it adds genuinely new words.
    let prefixOverlap = 0;
    const maxPrefix = Math.min(previousKeys.length, segmentKeys.length);
    for (let count = maxPrefix; count >= 3; count--) {
      if (previousKeys.slice(0, count).join(" ") === segmentKeys.slice(0, count).join(" ")) {
        prefixOverlap = count;
        break;
      }
    }
    if (prefixOverlap >= 3) {
      const remainder = collapseInsideSegment(segmentWords.slice(prefixOverlap).join(" "));
      if (!remainder || normalize(remainder) === previousKey) continue;
      output[output.length - 1] = `${previous.replace(/[.!?。！？]+$/u, "")} ${remainder}`.trim();
      continue;
    }

    // Remove overlap when a new chunk starts by repeating the tail of the prior
    // chunk, such as "I am good" followed by "am good today".
    let overlap = 0;
    const maxOverlap = Math.min(previousKeys.length, segmentKeys.length);
    for (let count = maxOverlap; count >= 2; count--) {
      if (previousKeys.slice(-count).join(" ") === segmentKeys.slice(0, count).join(" ")) {
        overlap = count;
        break;
      }
    }
    if (overlap >= 2) {
      const remainder = collapseInsideSegment(segmentWords.slice(overlap).join(" "));
      if (!remainder || normalize(remainder) === previousKey) continue;
      output[output.length - 1] = `${previous.replace(/[.!?。！？]+$/u, "")} ${remainder}`.trim();
      continue;
    }

    output.push(segment);
  }
  return output;
}

/** Regional/base locale candidates are fallbacks, not a guarantee of support. */
export function recognitionLocales(languageName) {
  const primary = COACH_LANGS[languageName] || COACH_LANGS.English;
  return [...new Set(LOCALE_ALTERNATES[languageName] || [primary, primary.split("-")[0]])];
}

/** Only persist valid language names; corrupted local storage must not hide all choices. */
export function normalizeUnavailableRecognitionLanguages(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(name => typeof name === "string" && Object.prototype.hasOwnProperty.call(COACH_LANGS, name)))];
}

export function selectableRecognitionLanguages(unavailable = []) {
  const blocked = new Set(normalizeUnavailableRecognitionLanguages(unavailable));
  return Object.keys(COACH_LANGS).filter(name => !blocked.has(name));
}

/** Maps browser-service codes to truthful, recoverable UI copy. */
export function recognitionErrorMessage(code, languageName) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access or the browser speech service was blocked. Check site microphone permission. You can continue by typing.";
    case "audio-capture":
      return "No working microphone was found. Connect or enable a microphone, then try again or type instead.";
    case "no-speech":
      return "No speech was detected. Try again and speak a little closer to the microphone.";
    case "network":
      return "The browser's speech-recognition service could not connect. This can happen even when normal internet works because recognition may use a separate browser service. You can continue by typing; AI replies can still be spoken aloud.";
    case "language-not-supported":
      return `The browser speech service rejected all supported locale variants for ${languageName}. That language will be hidden for speech input on this browser profile; typed chat remains available.`;
    default:
      return `Browser speech recognition stopped (${code || "unknown error"}). You can continue by typing instead.`;
  }
}
