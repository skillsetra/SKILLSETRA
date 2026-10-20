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

/** Rebuild browser speech results without repeating duplicate adjacent hypotheses. */
export function dedupeRecognitionSegments(values) {
  const segments = [];
  const normalize = value => String(value || "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  for (const value of values || []) {
    const segment = String(value || "").trim();
    if (!segment) continue;
    const key = normalize(segment);
    const previous = segments[segments.length - 1];
    if (previous && normalize(previous) === key) continue;
    segments.push(segment);
  }
  return segments;
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

/**DONE */