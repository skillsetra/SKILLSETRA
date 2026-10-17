"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, Check, Copy, Download, Expand, Headphones, Languages, Mic, MicOff, Minimize2, RotateCcw,
  Send, Settings2, Sparkles, Volume2, X,
} from "lucide-react";
import { api } from "../lib/api";
import { runPuter } from "../lib/ai";
import AIInsight from "./AIInsight";
import { useApp } from "./AppProvider";
import { COACH_LANGS, normalizeUnavailableRecognitionLanguages, recognitionErrorMessage, recognitionLocales, selectableRecognitionLanguages } from "../lib/coach-voice.mjs";

type Message = { role: "user" | "ai"; text: string };
type Mode = "chat" | "voice";
type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "typing" | "error";
type Provider = { id: string; name: string; tier?: string; model?: string; status?: string; connected?: boolean; server_side?: boolean };
type Model = { id: string; label?: string; recommended?: boolean };
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = { error?: string };
type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => RecognitionInstance;
type BrowserSpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

const DEFAULT_PROVIDER: Provider = { id: "puter", name: "AI", tier: "Browser AI", connected: true, model: "openai/gpt-oss-20b", status: "AI is managed automatically and runs in your browser." };
const DEFAULT_MODELS: Model[] = [{ id: "openai/gpt-oss-20b", label: "Default model", recommended: true }];
const LANGS: Readonly<Record<string, string>> = COACH_LANGS;
const VOICE_TESTS: Record<string, string> = {
  English: "Hello! This is SKILLSETRA. Your voice output is working.",
  Hindi: "नमस्ते! मैं स्किलसेट्रा हूँ। यह आपकी आवाज़ की जाँच है।",
  Gujarati: "નમસ્તે! હું સ્કિલસેટ્રા છું. આ તમારા અવાજની ચકાસણી છે.",
  Marathi: "नमस्कार! मी स्किलसेट्रा आहे. ही तुमच्या आवाजाची चाचणी आहे.",
  Bengali: "নমস্কার! আমি স্কিলসেট্রা। এটি আপনার কণ্ঠের পরীক্ষা।",
  Tamil: "வணக்கம்! நான் ஸ்கில்செட்ரா. இது உங்கள் குரல் சோதனை.",
  Telugu: "నమస్కారం! నేను స్కిల్‌సెట్రా. ఇది మీ స్వర పరీక్ష.",
  Kannada: "ನಮಸ್ಕಾರ! ನಾನು ಸ್ಕಿಲ್‌ಸೆಟ್ರಾ. ಇದು ನಿಮ್ಮ ಧ್ವನಿ ಪರೀಕ್ಷೆ.",
  Malayalam: "നമസ്കാരം! ഞാൻ സ്കിൽസെട്രയാണ്. ഇതൊരു ശബ്ദ പരിശോധനയാണ്.",
  Punjabi: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਕਿਲਸੈਟਰਾ ਹਾਂ। ਇਹ ਤੁਹਾਡੀ ਆਵਾਜ਼ ਦੀ ਜਾਂਚ ਹੈ।",
  Urdu: "السلام علیکم! میں اسکل سیٹرا ہوں۔ یہ آپ کی آواز کا امتحان ہے۔",
  Nepali: "नमस्ते! म स्किलसेट्रा हुँ। यो तपाईंको आवाज परीक्षण हो।",
  Odia: "ନମସ୍କାର! ମୁଁ ସ୍କିଲସେଟ୍ରା। ଏହା ଆପଣଙ୍କ ସ୍ୱର ପରୀକ୍ଷା।",
  Assamese: "নমস্কাৰ! মই স্কিলছেট্ৰা। এয়া আপোনাৰ কণ্ঠ পৰীক্ষা।",
  Sanskrit: "नमस्ते! अहं स्किलसेट्रा अस्मि। एषा स्वरपरीक्षा अस्ति।",
  Spanish: "¡Hola! Soy SKILLSETRA. Esta es una prueba de voz.",
  French: "Bonjour ! Je suis SKILLSETRA. Ceci est un test vocal.",
  German: "Hallo! Ich bin SKILLSETRA. Dies ist ein Sprachtest.",
  Portuguese: "Olá! Eu sou a SKILLSETRA. Este é um teste de voz.",
  Italian: "Ciao! Sono SKILLSETRA. Questa è una prova vocale.",
  Dutch: "Hallo! Ik ben SKILLSETRA. Dit is een stemtest.",
  Russian: "Здравствуйте! Я SKILLSETRA. Это проверка голоса.",
  Ukrainian: "Вітаю! Я SKILLSETRA. Це перевірка голосу.",
  Turkish: "Merhaba! Ben SKILLSETRA. Bu bir ses testidir.",
  Arabic: "مرحباً! أنا سكيلسترا. هذا اختبار للصوت.",
  Chinese: "你好！我是 SKILLSETRA。这是语音测试。",
  Japanese: "こんにちは、SKILLSETRAです。これは音声テストです。",
  Korean: "안녕하세요! 저는 SKILLSETRA입니다. 음성 테스트입니다.",
  Indonesian: "Halo! Saya SKILLSETRA. Ini adalah tes suara.",
  Thai: "สวัสดี ฉันคือ SKILLSETRA นี่คือการทดสอบเสียง",
  Vietnamese: "Xin chào! Tôi là SKILLSETRA. Đây là bài kiểm tra giọng nói.",
  Polish: "Cześć! Jestem SKILLSETRA. To jest test głosu.",
  Swedish: "Hej! Jag är SKILLSETRA. Det här är ett rösttest.",
  Greek: "Γεια σας! Είμαι η SKILLSETRA. Αυτή είναι μια δοκιμή φωνής.",
  Hebrew: "שלום! אני SKILLSETRA. זוהי בדיקת קול.",
};

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={i}>{part.slice(2, -2)}</strong>
    : part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : <span key={i}>{part}</span>)}</>;
}
function renderTextBlock(block: string, key: string) {
  const lines = block.split("\n").map(x => x.trim()).filter(Boolean);
  if (!lines.length) return null;
  if (lines.length === 1 && /^#{1,4}\s+/.test(lines[0])) return <h4 key={key}><InlineText text={lines[0].replace(/^#{1,4}\s+/, "")} /></h4>;
  if (lines.length > 1 && lines.every(x => /^[-*•]\s+/.test(x))) return <ul key={key}>{lines.map((x, j) => <li key={j}><InlineText text={x.replace(/^[-*•]\s+/, "")} /></li>)}</ul>;
  if (lines.length > 1 && lines.every(x => /^\d+[.)]\s+/.test(x))) return <ol key={key}>{lines.map((x, j) => <li key={j}><InlineText text={x.replace(/^\d+[.)]\s+/, "")} /></li>)}</ol>;
  return <p key={key}>{lines.map((line, j) => <span key={j}>{j > 0 && <br />}<InlineText text={line} /></span>)}</p>;
}
function AIAnswer({ text }: { text: string }) {
  return <div className="ai-answer">{text.split(/```/).map((chunk, ci) => ci % 2 === 1
    ? <pre className="ai-code-block" key={ci}><code>{chunk.replace(/^[a-zA-Z0-9_+-]+\n/, "")}</code></pre>
    : <div key={ci}>{chunk.split(/\n\s*\n/).map((block, bi) => renderTextBlock(block, `${ci}-${bi}`))}</div>)}</div>;
}
function isStructuredAIReport(text: string) {
  return /^\s*\|[^\n]*\|/m.test(text)
    || /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?(?:strengths?|missing points?|gaps?|risks?|next verification step|next steps?|evaluation of (?:the )?submitted answer|root cause|score breakdown|key findings)\b/im.test(text);
}
function plainSpeechText(text: string) {
  return text.replace(/```[\s\S]*?```/g, " Code sample omitted. ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
}
function splitForSpeech(text: string, maxLength = 190) {
  const sentences = text.match(/[^.!?।。！？]+[.!?।。！？]+["')\]]*|[^.!?।。！？]+$/gu) || [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxLength) {
      if (current) { chunks.push(current); current = ""; }
      let part = "";
      for (const word of trimmed.split(/\s+/)) {
        if (part && `${part} ${word}`.length > maxLength) { chunks.push(part); part = word; }
        else part = part ? `${part} ${word}` : word;
      }
      if (part) chunks.push(part);
    } else if (current && `${current} ${trimmed}`.length > maxLength) {
      chunks.push(current);
      current = trimmed;
    } else current = current ? `${current} ${trimmed}` : trimmed;
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.trim()].filter(Boolean);
}

type SpeechPlaybackOptions = {
  lang: string;
  rate: number;
  volume: number;
  voiceName?: string;
  voices?: SpeechSynthesisVoice[];
};

// Short sequential utterances avoid Chromium speech engines cutting off long
// responses. The caller owns cancellation, so an ended conversation cannot
// accidentally restart its microphone from a late speech callback.
function playSpeechQueue(
  text: string,
  options: SpeechPlaybackOptions,
  onComplete: () => void,
  onError: (reason: string) => void,
) {
  const chunks = splitForSpeech(text);
  let index = 0;
  let stopped = false;
  let nextTimer: number | null = null;
  let activeWatchdog: number | null = null;
  const playNext = () => {
    if (stopped) return;
    if (index >= chunks.length) { onComplete(); return; }
    const utterance = new SpeechSynthesisUtterance(chunks[index++]);
    utterance.lang = options.lang;
    utterance.rate = Math.max(0.7, Math.min(1.2, options.rate));
    utterance.volume = Math.max(0, Math.min(1, options.volume));
    utterance.pitch = 1;
    const voices = options.voices || [];
    const language = options.lang.toLowerCase().split("-")[0];
    const voiceMatchesLanguage = (candidate: SpeechSynthesisVoice) => {
      const candidateLanguage = candidate.lang.toLowerCase();
      return candidateLanguage === options.lang.toLowerCase()
        || candidateLanguage === language
        || candidateLanguage.startsWith(`${language}-`);
    };
    // Never apply a manually selected voice from a different language.
    const voice = (options.voiceName ? voices.find(v => v.name === options.voiceName && voiceMatchesLanguage(v)) : null)
      || voices.find(v => v.lang.toLowerCase() === options.lang.toLowerCase())
      || voices.find(v => voiceMatchesLanguage(v))
      || preferredSpeechVoice(options.lang);
    if (voice) utterance.voice = voice;
    let settled = false;
    const finishChunk = (failed?: string) => {
      if (stopped || settled) return;
      settled = true;
      if (activeWatchdog !== null) { window.clearTimeout(activeWatchdog); activeWatchdog = null; }
      if (failed) { stopped = true; onError(failed); return; }
      nextTimer = window.setTimeout(playNext, 180);
    };
    utterance.onend = () => finishChunk();
    utterance.onerror = event => {
      if (stopped) return;
      // Some browser engines report `interrupted`/`canceled` without an actual
      // user stop. Advance safely; explicit Stop sets `stopped` in cleanup.
      if (event.error === "canceled" || event.error === "interrupted") { finishChunk(); return; }
      finishChunk(event.error || "speech playback error");
    };
    try {
      // Some browser speech engines occasionally omit onend for a chunk. The
      // generous watchdog prevents the queue from freezing while giving speech
      // enough time to finish naturally at the selected rate.
      const expectedMs = Math.max(12000, Math.round((chunks[index - 1].length / (11 * Math.max(0.65, options.rate))) * 1000 + 14000));
      activeWatchdog = window.setTimeout(() => finishChunk(), expectedMs);
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (error: any) {
      finishChunk(error?.message || "speech playback error");
    }
  };
  nextTimer = window.setTimeout(playNext, 120);
  return () => {
    stopped = true;
    if (nextTimer !== null) window.clearTimeout(nextTimer);
    if (activeWatchdog !== null) { window.clearTimeout(activeWatchdog); activeWatchdog = null; }
  };
}
function preferredSpeechVoice(locale: string): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    const language = locale.toLowerCase().split("-")[0];
    const exact = voices.filter(voice => voice.lang.toLowerCase() === locale.toLowerCase());
    const sameLanguage = exact.length ? exact : voices.filter(voice => voice.lang.toLowerCase().startsWith(`${language}-`) || voice.lang.toLowerCase() === language);
    return sameLanguage.find(voice => /natural|neural|online|google|microsoft|aria|jenny|ava|samantha/i.test(voice.name)) || sameLanguage[0] || null;
  } catch { return null; }
}

export default function PersistentAIWidget({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const { user, language } = useApp();
  const [open, setOpen] = useState(initiallyOpen);
  const [full, setFull] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // Fixed initial state guarantees the server and browser render the same UI.
  // Saved preferences are restored after mount when the Coach opens.
  const [provider, setProvider] = useState("puter");
  const [model, setModel] = useState("openai/gpt-oss-20b");
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS);
  const [providers, setProviders] = useState<Provider[]>([DEFAULT_PROVIDER]);
    const [msgs, setMsgs] = useState<Message[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [providerLoading, setProviderLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceStatus, setVoiceStatus] = useState("Start a conversation to talk with AI.");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechVoiceName, setSpeechVoiceName] = useState("");
  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechVolume, setSpeechVolume] = useState(1);
  const [voiceLanguage, setVoiceLanguage] = useState("English");
  const [voicePrefsLoaded, setVoicePrefsLoaded] = useState(false);
  const [voiceTestPlaying, setVoiceTestPlaying] = useState(false);
  const [textListening, setTextListening] = useState(false);
  const [voiceTextInput, setVoiceTextInput] = useState("");
  const [voiceTextFallback, setVoiceTextFallback] = useState(false);
  const [microphoneRetryUsed, setMicrophoneRetryUsed] = useState(false);
  const [unavailableRecognitionLanguages, setUnavailableRecognitionLanguages] = useState<string[]>([]);
  const [recognitionLanguagePrefsLoaded, setRecognitionLanguagePrefsLoaded] = useState(false);

  const trigger = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const textRecognitionRef = useRef<RecognitionInstance | null>(null);
  const textDictationBaseRef = useRef("");
  const textDictationHasErrorRef = useRef(false);
  const textFallbackTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const voiceSessionRef = useRef(false);
  const voiceTextFallbackRef = useRef(false);
  const recognitionNetworkRetriesRef = useRef(0);
  const unavailableRecognitionRef = useRef<string[]>([]);
  const voiceBusyRef = useRef(false);
  const speechRunRef = useRef<(() => void) | null>(null);
  const latestVoiceTurnRef = useRef<(transcript: string) => Promise<void>>(async () => {});
  const startRecognitionRef = useRef<() => void>(() => {});
  const recognitionLocaleRef = useRef("en-IN");
  const recognitionAttemptedRef = useRef<string[]>([]);
  const providerRef = useRef(provider);
  const modelRef = useRef(model);
  const voiceLanguageRef = useRef(voiceLanguage);
  providerRef.current = provider;
  modelRef.current = model;
  voiceLanguageRef.current = voiceLanguage;

  const activeProvider = providers.find(p => p.id === provider) || DEFAULT_PROVIDER;
  const recognitionLanguageOptions = useMemo(() => selectableRecognitionLanguages(unavailableRecognitionLanguages), [unavailableRecognitionLanguages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skillsetra_unsupported_recognition_languages");
      const parsed = raw ? JSON.parse(raw) : [];
      const normalized = normalizeUnavailableRecognitionLanguages(parsed);
      unavailableRecognitionRef.current = normalized;
      setUnavailableRecognitionLanguages(normalized);
    } catch {
      unavailableRecognitionRef.current = [];
      setUnavailableRecognitionLanguages([]);
    } finally {
      setRecognitionLanguagePrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!recognitionLanguagePrefsLoaded || recognitionLanguageOptions.length === 0) return;
    if (unavailableRecognitionLanguages.includes(voiceLanguage)) {
      const nextLanguage = recognitionLanguageOptions[0];
      setVoiceLanguage(nextLanguage);
      setSpeechVoiceName("");
      voiceLanguageRef.current = nextLanguage;
      setVoiceStatus(`${voiceLanguage} is unavailable for speech recognition in this browser profile. Switched to ${nextLanguage}.`);
    }
  }, [recognitionLanguagePrefsLoaded, unavailableRecognitionLanguages, recognitionLanguageOptions, voiceLanguage]);

  const markRecognitionLanguageUnavailable = useCallback((languageName: string) => {
    if (!Object.prototype.hasOwnProperty.call(LANGS, languageName) || unavailableRecognitionRef.current.includes(languageName)) return;
    const updated = [...unavailableRecognitionRef.current, languageName];
    unavailableRecognitionRef.current = updated;
    setUnavailableRecognitionLanguages(updated);
    try { localStorage.setItem("skillsetra_unsupported_recognition_languages", JSON.stringify(updated)); } catch { /* Capability memory is optional. */ }
    const nextLanguage = selectableRecognitionLanguages(updated)[0];
    if (voiceLanguageRef.current === languageName && nextLanguage) {
      voiceLanguageRef.current = nextLanguage;
      setVoiceLanguage(nextLanguage);
      setSpeechVoiceName("");
    }
  }, []);

  const resetRecognitionLanguageChecks = () => {
    unavailableRecognitionRef.current = [];
    setUnavailableRecognitionLanguages([]);
    try { localStorage.removeItem("skillsetra_unsupported_recognition_languages"); } catch { /* Storage is optional. */ }
    setVoiceStatus("Speech-recognition language checks were reset for this browser profile. Languages are only excluded after the browser explicitly rejects them.");
  };

  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem("skillsetra_voice_name");
      const savedRate = Number(localStorage.getItem("skillsetra_voice_rate"));
      const savedVolume = Number(localStorage.getItem("skillsetra_voice_volume"));
      const savedLanguage = localStorage.getItem("skillsetra_voice_language");
      if (savedVoice) setSpeechVoiceName(savedVoice);
      if (savedLanguage && Object.prototype.hasOwnProperty.call(LANGS, savedLanguage)) setVoiceLanguage(savedLanguage);
      else if (Object.prototype.hasOwnProperty.call(LANGS, language)) setVoiceLanguage(language);
      if (Number.isFinite(savedRate) && savedRate >= 0.7 && savedRate <= 1.2) setSpeechRate(savedRate);
      if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) setSpeechVolume(savedVolume);
    } catch { /* Optional voice preferences may be unavailable in private mode. */ }
    setVoicePrefsLoaded(true);
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [language]);

  useEffect(() => {
    if (!speechVoiceName || availableVoices.length === 0) return;
    const localePrefix = (LANGS[voiceLanguage] || "en-IN").split("-")[0].toLowerCase();
    const compatible = availableVoices.some(voice => voice.name === speechVoiceName && (voice.lang.toLowerCase() === localePrefix || voice.lang.toLowerCase().startsWith(`${localePrefix}-`)));
    if (!compatible) setSpeechVoiceName("");
  }, [availableVoices, speechVoiceName, voiceLanguage]);

  useEffect(() => {
    if (!voicePrefsLoaded) return;
    try {
      localStorage.setItem("skillsetra_voice_name", speechVoiceName);
      localStorage.setItem("skillsetra_voice_rate", String(speechRate));
      localStorage.setItem("skillsetra_voice_volume", String(speechVolume));
      localStorage.setItem("skillsetra_voice_language", voiceLanguage);
    } catch { /* Preference persistence is optional. */ }
  }, [voicePrefsLoaded, speechVoiceName, speechRate, speechVolume, voiceLanguage]);

  useEffect(() => {
    if (open) messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, sending, open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setProviderLoading(true);
    Promise.allSettled([api<any>("/api/v1/ai/history")]).then(([historyResult]) => {
      if (!alive) return;
      if (historyResult.status === "fulfilled" && Array.isArray(historyResult.value?.items)) setMsgs(historyResult.value.items.filter((m: any) => m && (m.role === "user" || m.role === "ai") && typeof m.text === "string").slice(-40));
      setProviders([DEFAULT_PROVIDER]); setProvider("puter"); setModel(DEFAULT_MODELS[0].id); setModels(DEFAULT_MODELS); setModelsLoading(false);
      try { localStorage.setItem("skillsetra_ai_provider", "puter"); localStorage.setItem("skillsetra_ai_model", DEFAULT_MODELS[0].id); } catch { /* Preference persistence is optional. */ }
    }).finally(() => { if (alive) { setProviderLoading(false); setPreferencesLoaded(true); } });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") void exitFullscreen(); };
    document.addEventListener("keydown", esc);
    document.body.classList.add("ai-fullscreen-active");
    window.setTimeout(() => box.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(), 0);
    return () => { document.removeEventListener("keydown", esc); document.body.classList.remove("ai-fullscreen-active"); };
  }, [full]);

  useEffect(() => {
    if (!open) return;
    const w = window as BrowserSpeechWindow;
    setVoiceSupported("speechSynthesis" in window);
    setRecognitionSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, [open]);

  const stopVoiceSession = useCallback((announce = true) => {
    voiceSessionRef.current = false;
    voiceBusyRef.current = false;
    voiceTextFallbackRef.current = false;
    setVoiceTextInput("");
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    try { recognitionRef.current?.abort(); } catch { /* Browser may already have stopped recognition. */ }
    recognitionRef.current = null;
    if (textFallbackTimerRef.current !== null) window.clearTimeout(textFallbackTimerRef.current);
    textFallbackTimerRef.current = null;
    try { textRecognitionRef.current?.abort(); } catch { /* Browser may already have stopped dictation. */ }
    textRecognitionRef.current = null;
    setTextListening(false);
    speechRunRef.current?.();
    speechRunRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setVoiceState("idle");
    setVoiceTextFallback(false);
    setVoiceTestPlaying(false);
    if (announce) setVoiceStatus("Conversation ended. Voice transcripts are not shown or saved.");
  }, []);

  const speakAnswer = useCallback((answer: string) => {
    if (!voiceSessionRef.current) return;
    const spoken = plainSpeechText(answer);
    if (!spoken) {
      voiceBusyRef.current = false;
      if (voiceSessionRef.current) {
        setVoiceState("listening");
        setVoiceStatus("The AI reply was empty. The conversation is still active; listening will resume.");
        if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => startRecognitionRef.current(), 650);
      }
      return;
    }
    setVoiceState("speaking");
    setVoiceStatus("SKILLSETRA is speaking. You can interrupt by ending the conversation.");
    try {
      speechRunRef.current?.();
      window.speechSynthesis.cancel();
      speechRunRef.current = playSpeechQueue(spoken, {
        lang: LANGS[voiceLanguageRef.current] || "en-IN",
        rate: speechRate,
        volume: speechVolume,
        voiceName: speechVoiceName,
        voices: availableVoices,
      }, () => {
        speechRunRef.current = null;
        voiceBusyRef.current = false;
        if (voiceSessionRef.current) {
          if (voiceTextFallbackRef.current) {
            setVoiceState("typing");
            setVoiceStatus("Your turn. Type your next message below; SKILLSETRA will reply aloud. End conversation is always available above.");
          } else {
            setVoiceState("listening");
            setVoiceStatus("Your turn — speak naturally. No transcript will appear.");
            restartTimerRef.current = window.setTimeout(() => startRecognitionRef.current(), 450);
          }
        }
      }, reason => {
        speechRunRef.current = null;
        voiceBusyRef.current = false;
        if (voiceSessionRef.current) {
          try { window.speechSynthesis.cancel(); } catch { /* The failed utterance may already be ended. */ }
          setVoiceState("listening");
          setVoiceStatus(`Audio playback issue (${reason}). Your voice conversation remains open; listening will resume. You can end it whenever you are ready.`);
          if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
          restartTimerRef.current = window.setTimeout(() => startRecognitionRef.current(), 700);
        }
      });
    } catch {
      voiceBusyRef.current = false;
      if (voiceSessionRef.current) {
        setVoiceState("listening");
        setVoiceStatus("The browser could not play that reply. Your conversation remains active and listening will resume.");
        if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => startRecognitionRef.current(), 700);
      }
    }
  }, [availableVoices, speechRate, speechVoiceName, speechVolume]);

  async function askSelectedAI(question: string, voiceOnly: boolean): Promise<string> {
    const selectedProvider = providerRef.current;
    const selectedModel = modelRef.current;
    const responseLanguage = voiceLanguageRef.current || "English";
    const requestQuestion = voiceOnly
      ? `This is a live spoken conversation. Reply like a warm, natural human conversation partner. Give a useful answer in 2–4 short spoken sentences unless the user requests more detail. Use plain spoken language, no markdown, no lists, no code blocks, and no visual formatting. Answer only in ${responseLanguage}. The user said: ${question}`
      : `Reply in ${responseLanguage}, unless the user explicitly asks for another language. Keep the answer readable and useful. User message: ${question}`;
    try {
      const response = await api<any>("/api/v1/ai/ask", {
        method: "POST",
        body: JSON.stringify({ question: requestQuestion, context: window.location.pathname, language: responseLanguage, provider: selectedProvider, model: selectedModel, role: user?.targetRole || "", goal: "Build credible competency evidence" }),
      });
      if (response.mode === "puter-client") return await runPuter(response.prompt || requestQuestion, response.model || selectedModel);
      if (response.mode === "unavailable") throw new Error(response.notice || "AI assistance is temporarily unavailable. Check your connection and retry.");
      const answer = String(response.answer || "").trim();
      if (!answer) throw new Error("AI returned an empty answer.");
      return answer;
    } catch (error: any) {
      throw new Error(error?.message || "AI request failed. Check your connection and retry.");
    }
  }

  async function sendMessage() {
    const question = input.trim();
    if (!question || sending || modelsLoading || providerLoading || !modelRef.current) return;
    if (textFallbackTimerRef.current !== null) window.clearTimeout(textFallbackTimerRef.current);
    textFallbackTimerRef.current = null;
    if (textRecognitionRef.current) { try { textRecognitionRef.current.stop(); } catch { /* Already stopped. */ } textRecognitionRef.current = null; setTextListening(false); }
    setInput("");
    setMsgs(current => [...current, { role: "user", text: question }]);
    setSending(true);
    setStatus("");
    try {
      const answer = await askSelectedAI(question, false);
      setMsgs(current => [...current, { role: "ai", text: answer }]);
      await api("/api/v1/ai/history", { method: "POST", body: JSON.stringify({ item: { role: "user", text: question } }) }).catch(() => {});
      await api("/api/v1/ai/history", { method: "POST", body: JSON.stringify({ item: { role: "ai", text: answer } }) }).catch(() => {});
    } catch (error: any) {
      const message = error?.message || "AI assistance is temporarily unavailable. Please try again.";
      setStatus(message);
      setMsgs(current => [...current, { role: "ai", text: `I couldn't complete that request. ${message}` }]);
    } finally {
      setSending(false);
    }
  }

  const toggleTextDictation = () => {
    if (textListening && textRecognitionRef.current) {
      if (textFallbackTimerRef.current !== null) window.clearTimeout(textFallbackTimerRef.current);
      textFallbackTimerRef.current = null;
      const active = textRecognitionRef.current;
      textRecognitionRef.current = null;
      try { active.stop(); } catch { /* The recognition service may already have ended. */ }
      setTextListening(false);
      setStatus("Dictation stopped. Review or edit the recognized text before sending.");
      return;
    }
    const w = window as BrowserSpeechWindow;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus("Speech-to-text is unavailable in this browser. Try the latest Chrome or Edge, or type your message.");
      return;
    }
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      setStatus("Microphone dictation requires HTTPS on a deployed site, or localhost during development.");
      return;
    }
    const locales = recognitionLocales(voiceLanguageRef.current);
    textDictationBaseRef.current = input ? `${input}${/\s$/.test(input) ? "" : " "}` : "";
    textDictationHasErrorRef.current = false;
    let fallbackPending = false;
    const startAtLocale = (localeIndex: number) => {
      if (localeIndex >= locales.length) {
        textRecognitionRef.current = null;
        setTextListening(false);
        textDictationHasErrorRef.current = true;
        const rejectedLanguage = voiceLanguageRef.current;
        markRecognitionLanguageUnavailable(rejectedLanguage);
        setStatus(recognitionErrorMessage("language-not-supported", rejectedLanguage));
        return;
      }
      try {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = locales[localeIndex];
        recognition.onstart = () => { setTextListening(true); setStatus(`Listening in ${voiceLanguageRef.current} (${locales[localeIndex]}). Speak naturally; recognized words appear as editable text.`); };
        recognition.onresult = (event: RecognitionEvent) => {
          let finalText = "";
          let interimText = "";
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const recognizedText = result?.[0]?.transcript || "";
            if (result?.isFinal) finalText += `${recognizedText.trim()} `;
            else interimText += recognizedText;
          }
          const recognized = `${textDictationBaseRef.current}${finalText}${interimText}`;
          setInput(recognized.replace(/\s+$/, ""));
        };
        recognition.onerror = (event: RecognitionErrorEvent) => {
          const code = event.error || "unknown";
          if (code === "language-not-supported" && localeIndex + 1 < locales.length) {
            fallbackPending = true;
            setStatus(`Trying another browser speech locale for ${voiceLanguageRef.current}…`);
            if (textFallbackTimerRef.current !== null) window.clearTimeout(textFallbackTimerRef.current);
            textFallbackTimerRef.current = window.setTimeout(() => {
              textFallbackTimerRef.current = null;
              if (textRecognitionRef.current !== recognition) return;
              try { recognition.abort(); } catch { /* Expected while changing locale. */ }
              textRecognitionRef.current = null;
              fallbackPending = false;
              startAtLocale(localeIndex + 1);
            }, 180);
            return;
          }
          textDictationHasErrorRef.current = true;
          if (code === "aborted") return;
          const failedLanguage = voiceLanguageRef.current;
          if (code === "language-not-supported") markRecognitionLanguageUnavailable(failedLanguage);
          setStatus(recognitionErrorMessage(code, failedLanguage));
        };
        recognition.onend = () => {
          if (textRecognitionRef.current !== recognition || fallbackPending) return;
          textRecognitionRef.current = null;
          setTextListening(false);
          if (!textDictationHasErrorRef.current) setStatus("Speech converted to editable text. Review it before sending.");
        };
        textRecognitionRef.current = recognition;
        setTextListening(true);
        recognition.start();
      } catch (error: any) {
        textRecognitionRef.current = null;
        setTextListening(false);
        textDictationHasErrorRef.current = true;
        setStatus(error?.message || `Could not start ${voiceLanguageRef.current} speech dictation. Check microphone permission and try again.`);
      }
    };
    setStatus(`Starting ${voiceLanguageRef.current} speech-to-text…`);
    startAtLocale(0);
  };

  latestVoiceTurnRef.current = async (transcript: string) => {
    if (!voiceSessionRef.current || voiceBusyRef.current || !transcript.trim()) return;
    voiceBusyRef.current = true;
    try { recognitionRef.current?.stop(); } catch { /* It can already be stopped after a speech result. */ }
    setVoiceState("thinking");
    setVoiceStatus("I heard you. Your selected AI is preparing a spoken reply…");
    try {
      const answer = await askSelectedAI(transcript.trim(), true);
      if (!voiceSessionRef.current) return;
      if (!plainSpeechText(answer)) throw new Error("The AI reply did not contain text suitable for speech. Your words are preserved below; retry or use normal text chat.");
      speakAnswer(answer);
    } catch (error: any) {
      voiceBusyRef.current = false;
      if (!voiceSessionRef.current) return;
      // Preserve the recognized message and keep the session active. The user
      // can still end the session explicitly; a transient AI failure must not
      // silently tear down the microphone lifecycle.
      setVoiceTextInput(transcript.trim());
      setVoiceState("listening");
      setVoiceStatus(`${error?.message || "The AI could not respond."} Your words are preserved. The conversation remains active and listening will resume; use End conversation whenever you want to stop.`);
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = window.setTimeout(() => startRecognitionRef.current(), 700);
    }
  };

  startRecognitionRef.current = () => {
    if (!voiceSessionRef.current || voiceBusyRef.current) return;
    if (voiceTextFallbackRef.current) {
      setVoiceState("typing");
      setVoiceStatus("Typed voice-chat fallback is active. Enter a message below; AI replies will be spoken aloud.");
      return;
    }
    const w = window as BrowserSpeechWindow;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setRecognitionSupported(false);
      voiceTextFallbackRef.current = true;
      setVoiceTextFallback(true);
      setVoiceState("typing");
      setVoiceStatus("Speech recognition is unavailable in this browser. Type your messages below; AI replies can still be spoken aloud.");
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      const requestedLocale = recognitionLocaleRef.current || (LANGS[voiceLanguageRef.current] || "en-IN");
      recognition.lang = requestedLocale;
      if (!recognitionAttemptedRef.current.includes(requestedLocale)) recognitionAttemptedRef.current.push(requestedLocale);
      recognition.onstart = () => { if (voiceSessionRef.current && !voiceBusyRef.current && !voiceTextFallbackRef.current) { setVoiceState("listening"); setVoiceStatus("Listening… speak naturally when you are ready."); } };
      recognition.onresult = (event: RecognitionEvent) => {
        const finalWords: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result?.isFinal && result[0]?.transcript) finalWords.push(result[0].transcript.trim());
        }
        if (finalWords.length && !voiceTextFallbackRef.current) { recognitionNetworkRetriesRef.current = 0; void latestVoiceTurnRef.current(finalWords.join(" ")); }
      };
      recognition.onerror = (event: RecognitionErrorEvent) => {
        const code = event.error || "unknown";
        if (!voiceSessionRef.current || code === "aborted") return;
        if (code === "no-speech") return; // onend restarts recognition when appropriate
        voiceBusyRef.current = false;
        if (code === "not-allowed" || code === "service-not-allowed") {
          voiceTextFallbackRef.current = true;
          setVoiceTextFallback(true);
          setVoiceState("typing");
          setVoiceStatus(recognitionErrorMessage(code, voiceLanguageRef.current));
          return;
        }
        if (code === "language-not-supported") {
          const nextLocale = recognitionLocales(voiceLanguageRef.current).find(locale => !recognitionAttemptedRef.current.includes(locale));
          if (nextLocale) {
            recognitionLocaleRef.current = nextLocale;
            setVoiceState("listening");
            setVoiceStatus(`The browser rejected ${recognition.lang}. Trying alternate recognition locale ${nextLocale}; your selected reply language remains ${voiceLanguageRef.current}.`);
            return; // onend restarts with the next locale
          }
          const rejectedLanguage = voiceLanguageRef.current;
          markRecognitionLanguageUnavailable(rejectedLanguage);
          voiceTextFallbackRef.current = true;
          setVoiceTextFallback(true);
          voiceBusyRef.current = false;
          setVoiceState("typing");
          setVoiceStatus(recognitionErrorMessage("language-not-supported", rejectedLanguage) + " The conversation stays open in typed mode, and AI replies will still be spoken aloud.");
          return;
        }
        if (code === "audio-capture") {
          voiceTextFallbackRef.current = true;
          setVoiceTextFallback(true);
          setVoiceState("typing");
          setVoiceStatus(recognitionErrorMessage(code, voiceLanguageRef.current));
          return;
        }
        if (code === "network") {
          voiceBusyRef.current = false;
          if (recognitionNetworkRetriesRef.current < 2) {
            recognitionNetworkRetriesRef.current += 1;
            voiceTextFallbackRef.current = false;
            setVoiceTextFallback(false);
            setVoiceState("listening");
            setVoiceStatus(`Speech recognition temporarily disconnected. Reconnecting (${recognitionNetworkRetriesRef.current}/2); your conversation remains active.`);
            return; // onend performs the bounded retry
          }
          voiceTextFallbackRef.current = true;
          setVoiceTextFallback(true);
          setVoiceState("typing");
          setVoiceStatus(`${recognitionErrorMessage(code, voiceLanguageRef.current)} Voice session remains active in typed fallback; AI replies will still be spoken. End conversation when you choose.`);
          return;
        }
        // Keep the session controllable and recoverable; don't create a
        // reconnect loop after a browser-service failure.
        voiceTextFallbackRef.current = true;
        setVoiceTextFallback(true);
        setVoiceState("typing");
        setVoiceStatus(recognitionErrorMessage(code, voiceLanguageRef.current));
      };
      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        if (voiceSessionRef.current && !voiceBusyRef.current && !voiceTextFallbackRef.current) {
          if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
          restartTimerRef.current = window.setTimeout(() => startRecognitionRef.current(), 400);
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error: any) {
      voiceBusyRef.current = false;
      voiceTextFallbackRef.current = true;
      setVoiceTextFallback(true);
      setVoiceState("typing");
      setVoiceStatus(`${error?.message || "Speech recognition could not start."} The conversation remains open in typed mode; no automatic reconnect will be attempted.`);
    }
  };

  const startVoiceSession = () => {
    const w = window as BrowserSpeechWindow;
    if (!("speechSynthesis" in window)) {
      setVoiceSupported(false);
      setVoiceState("error");
      setVoiceStatus("This browser does not support spoken replies. Continue in normal text chat instead.");
      return;
    }
    speechRunRef.current?.();
    speechRunRef.current = null;
    window.speechSynthesis.cancel();
    voiceSessionRef.current = true;
    voiceBusyRef.current = false;
    voiceTextFallbackRef.current = false;
    setVoiceTextFallback(false);
    setVoiceTextInput("");
    setMicrophoneRetryUsed(false);
    recognitionAttemptedRef.current = [];
    recognitionNetworkRetriesRef.current = 0;
    recognitionLocaleRef.current = recognitionLocales(voiceLanguageRef.current)[0] || "en-IN";
    setVoiceTestPlaying(false);

    const enterTypedFallback = (reason: string) => {
      voiceTextFallbackRef.current = true;
      setVoiceTextFallback(true);
      setVoiceState("typing");
      setVoiceStatus(`${reason} Type your messages below; AI replies will still be spoken aloud. End conversation remains available in the top bar.`);
    };
    if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) {
      setRecognitionSupported(false);
      enterTypedFallback("This browser does not expose speech recognition.");
      return;
    }
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      enterTypedFallback("Microphone recognition requires HTTPS on a deployed site. Typed voice chat is available here.");
      return;
    }
    if (recognitionLanguageOptions.length === 0) {
      enterTypedFallback("The browser has rejected all currently listed speech-recognition languages.");
      return;
    }
    setVoiceStatus("Connecting to your microphone… allow access if your browser asks.");
    setVoiceState("listening");
    startRecognitionRef.current();
  };

  async function sendVoiceTypedMessage() {
    const question = voiceTextInput.trim();
    if (!question || voiceBusyRef.current || !voiceSessionRef.current) return;
    voiceBusyRef.current = true;
    setVoiceState("thinking");
    setVoiceStatus("Preparing a spoken reply…");
    try {
      const answer = await askSelectedAI(question, true);
      if (!voiceSessionRef.current) return;
      if (!plainSpeechText(answer)) throw new Error("The AI reply did not contain text suitable for speech. Your message is still in the box; retry or use normal text chat.");
      setVoiceTextInput("");
      speakAnswer(answer);
    } catch (error: any) {
      voiceBusyRef.current = false;
      if (!voiceSessionRef.current) return;
      voiceTextFallbackRef.current = true;
      setVoiceTextFallback(true);
      setVoiceState("typing");
      setVoiceStatus(`${error?.message || "The AI could not respond."} Your message is still in the box so you can retry.`);
    }
  }

  const resumeVoiceRecognition = () => {
    if (!voiceSessionRef.current || !recognitionSupported || recognitionLanguageOptions.length === 0 || microphoneRetryUsed) return;
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      setVoiceTextFallback(true);
      voiceTextFallbackRef.current = true;
      setVoiceState("typing");
      setVoiceStatus("Microphone recognition requires HTTPS. Typed voice chat remains available.");
      return;
    }
    setMicrophoneRetryUsed(true);
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    try { recognitionRef.current?.abort(); } catch { /* Ignore an already-ended recognizer. */ }
    recognitionRef.current = null;
    voiceTextFallbackRef.current = false;
    setVoiceTextFallback(false);
    recognitionAttemptedRef.current = [];
    recognitionLocaleRef.current = recognitionLocales(voiceLanguageRef.current)[0] || "en-IN";
    setVoiceState("listening");
    setVoiceStatus("Trying speech input once. If the browser service fails again, typed mode will remain available.");
    startRecognitionRef.current();
  };

  const enterFullscreen = async () => { try { if (box.current?.requestFullscreen) await box.current.requestFullscreen(); } catch { /* CSS fullscreen is used as a fallback. */ } setFull(true); };
  const exitFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* Browser may already have left fullscreen. */ } setFull(false); window.setTimeout(() => trigger.current?.focus(), 0); };

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try { localStorage.setItem("skillsetra_ai_provider", provider); localStorage.setItem("skillsetra_ai_model", model); } catch { /* Storage may be disabled. */ }
  }, [provider, model, preferencesLoaded]);

  useEffect(() => () => {
    voiceSessionRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch { /* Ignore teardown errors. */ }
    try { textRecognitionRef.current?.abort(); } catch { /* Ignore teardown errors. */ }
    textRecognitionRef.current = null;
    speechRunRef.current?.();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    // Switching modes must stop any previous speech; otherwise playback from
    // Normal Chat could overlap with microphone listening in Voice Chat.
    speechRunRef.current?.();
    speechRunRef.current = null;
    if (textFallbackTimerRef.current !== null) window.clearTimeout(textFallbackTimerRef.current);
    textFallbackTimerRef.current = null;
    if (textRecognitionRef.current) { try { textRecognitionRef.current.abort(); } catch { /* Already stopped. */ } textRecognitionRef.current = null; setTextListening(false); }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingMessageIndex(null);
    setVoiceTestPlaying(false);
    if (mode !== "voice") stopVoiceSession(false);
  }, [mode, stopVoiceSession]);

  useEffect(() => {
    if (!open) { stopVoiceSession(false); return; }
    const onChange = () => { if (document.visibilityState === "hidden" && voiceSessionRef.current) stopVoiceSession(false); };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [open, stopVoiceSession]);

  // Only one SKILLSETRA feature should own the microphone/speaker session at a time.
  useEffect(() => {
    const stopForInterview = () => stopVoiceSession(false);
    window.addEventListener("skillsetra:stop-voice", stopForInterview);
    return () => window.removeEventListener("skillsetra:stop-voice", stopForInterview);
  }, [stopVoiceSession]);

  const playVoiceTest = () => {
    if (!("speechSynthesis" in window)) {
      setVoiceStatus("This browser does not support speech playback. Try the latest Chrome or Edge.");
      return;
    }
    stopAnswerSpeech();
    setVoiceTestPlaying(true);
    const testText = VOICE_TESTS[voiceLanguage] || VOICE_TESTS.English;
    const languageCode = LANGS[voiceLanguage] || "en-IN";
    const languagePrefix = languageCode.split("-")[0].toLowerCase();
    const hasMatchingVoice = availableVoices.some(voice => {
      const voiceLang = voice.lang.toLowerCase();
      return voiceLang === languageCode.toLowerCase() || voiceLang === languagePrefix || voiceLang.startsWith(`${languagePrefix}-`);
    });
    setVoiceStatus(hasMatchingVoice
      ? `Testing ${voiceLanguage} speech output…`
      : `No installed ${voiceLanguage} speech voice was detected. Testing the browser's language-aware fallback; if pronunciation is incorrect, install a ${voiceLanguage} system voice or choose another language.`);
    speechRunRef.current = playSpeechQueue(
      testText,
      { lang: languageCode, rate: speechRate, volume: speechVolume, voiceName: speechVoiceName, voices: availableVoices },
      () => { speechRunRef.current = null; setVoiceTestPlaying(false); },
      reason => { speechRunRef.current = null; setVoiceTestPlaying(false); setVoiceStatus(`Speaker test failed (${reason}). Check your system volume and installed language voices.`); },
    );
  };

  const stopAnswerSpeech = useCallback(() => {
    speechRunRef.current?.();
    speechRunRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingMessageIndex(null);
    setVoiceTestPlaying(false);
  }, []);

  const listenToAnswer = (answer: string, index: number) => {
    if (!("speechSynthesis" in window)) { setStatus("Speech playback is unavailable in this browser."); return; }
    if (speakingMessageIndex === index) { stopAnswerSpeech(); return; }
    stopAnswerSpeech();
    const spoken = plainSpeechText(answer);
    if (!spoken) { setStatus("There is no readable text in this answer to speak."); return; }
    setStatus("");
    setSpeakingMessageIndex(index);
    speechRunRef.current = playSpeechQueue(
      spoken,
      { lang: LANGS[voiceLanguageRef.current] || "en-IN", rate: speechRate, volume: speechVolume, voiceName: speechVoiceName, voices: availableVoices },
      () => { speechRunRef.current = null; setSpeakingMessageIndex(null); },
      reason => { speechRunRef.current = null; setSpeakingMessageIndex(null); setStatus(`Speech playback failed (${reason}). Check your device volume or select an installed voice.`); },
    );
  };

  useEffect(() => {
    if (open) return;
    stopAnswerSpeech();
  }, [open, stopAnswerSpeech]);

  const exportConversation = () => {
    if (!msgs.length) { setStatus("There is no text conversation to export yet."); return; }
    const markdown = `# SKILLSETRA AI Coach conversation\n\n${msgs.map(message => `## ${message.role === "user" ? "You" : "SKILLSETRA AI"}\n\n${message.text}`).join("\n\n---\n\n")}\n`;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `skillsetra-ai-conversation-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Conversation exported as Markdown.");
  };

  if (!user) return null;

  const content = <div ref={box} className={`ai-window ${full ? "ai-window-full" : ""} ${mode === "voice" ? "ai-voice-window" : ""}`}>
    <div className="ai-head">
      <div className="ai-head-brand"><span className="ai-head-mark"><Sparkles size={15} /></span><div><b>SKILLSETRA Coach</b><small>{mode === "voice" ? "Live voice conversation · no transcript" : "Role-aware · evidence-aware · provider controlled"}</small></div></div>
      <div className="ai-head-actions">
        <button type="button" onClick={() => setShowSettings(v => !v)} title={showSettings ? "Hide AI settings" : "Show AI settings"} aria-label="Toggle AI settings" aria-expanded={showSettings}><Settings2 size={16} /></button>
        {mode === "chat" && speakingMessageIndex !== null && <button type="button" className="ai-header-stop" onClick={stopAnswerSpeech} title="Stop AI speech immediately" aria-label="Stop AI speech"><MicOff size={15} /><span>Stop audio</span></button>}
        {mode === "voice" && <button type="button" className="ai-header-stop" onClick={() => stopVoiceSession()} disabled={voiceState === "idle" || voiceState === "error"} title="End the voice conversation and stop current speech" aria-label="End conversation"><MicOff size={15} /><span>End conversation</span></button>}
        {mode === "chat" && <button type="button" onClick={exportConversation} title="Export text conversation as Markdown" aria-label="Export conversation"><Download size={16} /></button>}
        {mode === "chat" && <button type="button" onClick={async () => { if (!window.confirm("Clear this Coach conversation from the current workspace?")) return; await api("/api/v1/ai/history", { method: "DELETE" }).catch(() => {}); setMsgs([]); }} title="Clear saved conversation" aria-label="Clear conversation"><RotateCcw size={16} /></button>}
        <button type="button" onClick={full ? exitFullscreen : enterFullscreen} title={full ? "Exit fullscreen" : "Enter fullscreen"} aria-label={full ? "Exit fullscreen" : "Enter fullscreen"}>{full ? <Minimize2 size={16} /> : <Expand size={16} />}</button>
        <button type="button" onClick={() => { stopVoiceSession(false); setOpen(false); if (full) void exitFullscreen(); }} title="Close AI Coach" aria-label="Close AI Coach"><X size={17} /></button>
      </div>
    </div>

    <div className="ai-mode-tabs" role="tablist" aria-label="AI Coach mode">
      <button type="button" role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "active" : ""} onClick={() => { if (mode === "voice" && voiceSessionRef.current) stopVoiceSession(false); setMode("chat"); }}><Bot size={15} /> Normal Chat <span>Text + optional audio</span></button>
      <button type="button" role="tab" aria-selected={mode === "voice"} className={mode === "voice" ? "active" : ""} onClick={() => { if (voiceSessionRef.current) stopVoiceSession(false); stopAnswerSpeech(); setMode("voice"); }}><Headphones size={15} /> Voice Chat <span>Talk naturally</span></button>
    </div>

    {showSettings && <div className="ai-settings-panel">
      <div className="ai-provider-picker">
        <div className="ai-provider-fixed"><span className="tag good">AI · ENABLED</span><small>AI service settings are managed automatically.</small></div>
      </div>
      <div className="ai-provider-status"><span className="tag good">BROWSER AI</span><small>{providerLoading ? "Loading saved conversation…" : activeProvider.status || "The AI service runs in your browser. Availability is checked when you send a request."}</small></div>
    </div>}

    {status && mode === "chat" && <div className="notice" role="status">{status}</div>}

    {mode === "chat" ? <>
      <div className="ai-messages" ref={messagesRef} aria-live="polite">
        {msgs.length === 0 && <div className="ai-welcome"><div className="ai-orb"><Bot size={24} /></div><h3>What do you want to prove?</h3><p>Ask about your {user.targetRole || "target role"}, a skill gap, assessment, project, repository or learning step.</p><div className="prompt-chips"><button type="button" onClick={() => setInput("What are my biggest skill gaps for my target role?")}>Find my gaps</button><button type="button" onClick={() => setInput("Give me a practice task for my weakest target skill.")}>Practice a gap</button><button type="button" onClick={() => setInput("How should I prove my current skill with evidence?")}>Build evidence</button></div></div>}
        {msgs.map((m, i) => <div className={`chat-msg ${m.role}`} key={`${i}-${m.text.slice(0, 10)}`}><span>{m.role === "ai" ? <Bot size={17} /> : <span className="avatar">{(user.name || "L").slice(0, 1).toUpperCase()}</span>}</span><div className="chat-content">{m.role === "ai" ? (isStructuredAIReport(m.text) ? <AIInsight text={m.text} compact /> : <AIAnswer text={m.text} />) : <p>{m.text}</p>}{m.role === "ai" && <div className="ai-message-actions"><button type="button" className="ai-copy" onClick={() => { void navigator.clipboard?.writeText(m.text); setCopied(i); window.setTimeout(() => setCopied(null), 1400); }} title="Copy answer">{copied === i ? <Check size={12} /> : <Copy size={12} />} {copied === i ? "Copied" : "Copy"}</button><button type="button" className="ai-copy" onClick={() => listenToAnswer(m.text, i)} title={speakingMessageIndex === i ? "Stop speaking this answer" : "Listen to full answer"} aria-label={speakingMessageIndex === i ? "Stop listening to this answer" : "Listen to this answer"}>{speakingMessageIndex === i ? <><MicOff size={12} /> Stop</> : <><Volume2 size={12} /> Listen</>}</button></div>}</div></div>)}
        {sending && <div className="chat-msg ai"><Bot size={17} /><p>Waiting for the selected provider…</p></div>}
      </div>
      <form className="ai-compose" onSubmit={e => { e.preventDefault(); void sendMessage(); }}>
        <div className="ai-compose-tools">
          <label className="ai-chat-language"><Languages size={14} /><span>Chat & dictation</span><select value={recognitionLanguageOptions.includes(voiceLanguage) ? voiceLanguage : ""} onChange={e => { const next=e.target.value; if (!next || !LANGS[next]) return; setVoiceLanguage(next); setSpeechVoiceName(""); setStatus(`Chat and dictation language set to ${next}.`); }} aria-label="Chat and speech-to-text language">{recognitionLanguageOptions.length ? recognitionLanguageOptions.map(lang => <option key={lang} value={lang}>{lang}</option>) : <option value="">No confirmed recognition languages</option>}</select></label>
          <button type="button" className={`ai-dictate-button ${textListening ? "recording" : ""}`} onClick={toggleTextDictation} aria-pressed={textListening} title={textListening ? "Stop speech-to-text dictation" : "Speak and convert your speech into editable text"}>{textListening ? <MicOff size={15} /> : <Mic size={15} />}{textListening ? "Stop dictation" : "Speak to type"}</button>
        </div>
        <div className="ai-compose-main"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder={`Ask your AI Coach about ${user.targetRole || "your competency journey"}…`} aria-label="Message AI Coach" /><button type="button" className="ai-dictate-icon" onClick={toggleTextDictation} aria-label={textListening ? "Stop speech-to-text dictation" : "Speak and convert to text"} aria-pressed={textListening} title={textListening ? "Stop dictation" : "Speak to type"}>{textListening ? <MicOff size={17} /> : <Mic size={17} />}</button><button type="submit" disabled={sending || providerLoading || !input.trim()} aria-label="Send message"><Send size={17} /></button></div>
      </form>
    </> : <section className={`ai-voice-stage voice-${voiceState}`} aria-label="Voice conversation panel">
      <div className="ai-voice-fullscreen-actions">
        <button type="button" className="button" onClick={() => void (full ? exitFullscreen() : enterFullscreen())} aria-label={full ? "Exit fullscreen voice chat" : "Open voice chat fullscreen"}>{full ? <Minimize2 size={15} /> : <Expand size={15} />}{full ? "Exit fullscreen" : "Fullscreen voice chat"}</button>
        <button type="button" className="button" onClick={() => { stopVoiceSession(); setMode("chat"); }} aria-label="Close voice chat and return to text chat"><X size={15} /> Close voice chat</button>
      </div>
      <div className={`voice-face-wrap ${voiceState === "listening" ? "is-listening" : ""} ${voiceState === "speaking" ? "is-speaking" : ""} ${voiceState === "thinking" ? "is-thinking" : ""} ${voiceState === "typing" ? "is-typing" : ""}`}>
        <span className="voice-ring voice-ring-one" /><span className="voice-ring voice-ring-two" />
        <div className="voice-face"><img src="/skillsetra-logo.png" alt="SKILLSETRA AI face" /></div>
        {voiceState === "listening" && <span className="voice-live-dot" />}
      </div>
      <div className={`voice-waveform state-${voiceState}`} aria-hidden="true">{[0,1,2,3,4,5,6,7,8].map(bar => <span key={bar} style={{animationDelay:`${bar * 75}ms`}} />)}</div>
      <h3>{voiceState === "listening" ? "I'm listening" : voiceState === "thinking" ? "Let me think" : voiceState === "speaking" ? "I'm speaking" : voiceState === "typing" ? "Continue by typing" : voiceState === "error" ? "Voice input unavailable" : "Talk to SKILLSETRA"}</h3>
      <p className="voice-status" role="status">{voiceStatus}</p>
      <div className="voice-provider-chip"><Sparkles size={14} /><span>{activeProvider.name}</span><i />Managed</div>
      <details className="voice-sound-settings">
        <summary><Volume2 size={14} /> Voice and sound settings</summary>
        <div className="voice-setting-row"><label htmlFor="skillsetra-voice-language">Conversation language</label><select id="skillsetra-voice-language" value={recognitionLanguageOptions.includes(voiceLanguage) ? voiceLanguage : ""} onChange={e => { const next=e.target.value; if (!next || !LANGS[next]) return; setVoiceLanguage(next); setSpeechVoiceName(""); if (voiceSessionRef.current) stopVoiceSession(false); setVoiceStatus(`Voice language set to ${next}. Start a new conversation to use it.`); }} >{recognitionLanguageOptions.length ? recognitionLanguageOptions.map(lang => <option key={lang} value={lang}>{lang} · {LANGS[lang]}{availableVoices.some(voice => voice.lang.toLowerCase() === LANGS[lang].toLowerCase() || voice.lang.toLowerCase().startsWith(`${LANGS[lang].split("-")[0].toLowerCase()}-`)) ? " · speech output available" : " · output fallback"}</option>) : <option value="">No confirmed recognition languages</option>}</select></div>
        <small className="voice-language-help">Speech recognition is browser-service dependent; installed speaker voices do not guarantee recognition support. SKILLSETRA tries regional alternatives and excludes a language only after the browser rejects all variants. A service network error does not mark the language unsupported. HTTPS and microphone permission are required on deployed sites.</small>
        <div className="voice-test-row"><button type="button" className="voice-test-button" onClick={resetRecognitionLanguageChecks} disabled={!unavailableRecognitionLanguages.length}>Reset language checks</button><small>Use after changing browser, device, or speech-service settings.</small></div>
        <div className="voice-setting-row"><label htmlFor="skillsetra-voice-select">Speaking voice</label><select id="skillsetra-voice-select" value={speechVoiceName} onChange={e => setSpeechVoiceName(e.target.value)}><option value="">Automatic · best match for {voiceLanguage}</option>{availableVoices.filter(voice => voice.lang.toLowerCase().startsWith(LANGS[voiceLanguage].split("-")[0].toLowerCase())).map(voice => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}</select></div>
        {!availableVoices.some(voice => voice.lang.toLowerCase().startsWith(LANGS[voiceLanguage].split("-")[0].toLowerCase())) && <small className="voice-language-help">No installed speech voice for {voiceLanguage} was detected. Your browser may fall back to its default voice; install a system voice or try another supported language.</small>}
        <div className="voice-setting-row"><label htmlFor="skillsetra-voice-rate">Speaking speed <strong>{speechRate.toFixed(2)}×</strong></label><input id="skillsetra-voice-rate" type="range" min="0.7" max="1.2" step="0.05" value={speechRate} onChange={e => setSpeechRate(Number(e.target.value))} /></div>
        <div className="voice-setting-row"><label htmlFor="skillsetra-voice-volume">Browser speech volume <strong>{Math.round(speechVolume * 100)}%</strong></label><input id="skillsetra-voice-volume" type="range" min="0.3" max="1" step="0.05" value={speechVolume} onChange={e => setSpeechVolume(Number(e.target.value))} /></div>
        <div className="voice-test-row"><button type="button" className="voice-test-button" onClick={playVoiceTest} disabled={voiceTestPlaying || ["listening", "thinking", "speaking", "typing"].includes(voiceState)}><Volume2 size={14} /> {voiceTestPlaying ? "Testing speaker…" : "Test speaker"}</button><small>Set to 100% for maximum browser speech volume. Your computer and browser volume still affect loudness.</small></div>
      </details>
      {!recognitionSupported && <p className="voice-capability-note">This browser does not expose speech recognition. Typed voice chat is available here, and SKILLSETRA can still read its replies aloud.</p>}
      {!voiceSupported && <p className="voice-capability-note">This browser does not expose speech playback. Use normal text chat; voice playback cannot be enabled by this page.</p>}
      {recognitionLanguageOptions.length === 0 && <p className="voice-capability-note" role="status">The browser has rejected every listed language for speech recognition. You can still use text chat and test installed speech output. Reset language checks if your browser or its language support changes.</p>}
      {(voiceState === "idle" || voiceState === "error") && !voiceTextFallback && <button type="button" className="voice-start-button" onClick={startVoiceSession} disabled={!voiceSupported || providerLoading}><Mic size={18} /> Start voice conversation</button>}
      {voiceState === "typing" && <form className="ai-voice-typed-fallback" onSubmit={e => { e.preventDefault(); void sendVoiceTypedMessage(); }}><label htmlFor="skillsetra-voice-typed-message">Your message</label><textarea id="skillsetra-voice-typed-message" rows={2} maxLength={4000} value={voiceTextInput} onChange={e => setVoiceTextInput(e.target.value)} placeholder="Type what you want to say. SKILLSETRA will reply aloud…" disabled={voiceBusyRef.current} /><div className="ai-voice-typed-actions"><span>{voiceTextInput.length}/4000</span><button type="submit" className="voice-start-button" disabled={!voiceTextInput.trim() || voiceBusyRef.current}><Send size={15} /> Send and hear reply</button><button type="button" className="button" onClick={resumeVoiceRecognition} disabled={!recognitionSupported || recognitionLanguageOptions.length === 0 || microphoneRetryUsed}>{microphoneRetryUsed ? "Microphone retry used" : "Try microphone once"}</button></div></form>}
      <div className="voice-privacy-note"><Mic size={13} /> {voiceTextFallback ? "Typed fallback messages appear only in this panel and are not saved to chat history. Browser speech recognition may process audio under your browser provider’s policies." : "Spoken input and replies are not displayed or saved to chat history. Browser speech recognition may process audio under your browser provider’s policies."}</div>
      <div className="ai-voice-bottom-actions"><span>{voiceState === "speaking" ? "AI voice is playing" : voiceState === "listening" ? "Microphone is active" : voiceState === "thinking" ? "Preparing a reply" : "Conversation controls"}</span><button type="button" className="ai-voice-end-button" onClick={() => { stopVoiceSession(); setMode("chat"); }}><MicOff size={16}/> End conversation</button></div>
    </section>}
  </div>;

  return <>
    {!open && <button ref={trigger} type="button" className="ai-fab" onClick={() => setOpen(true)} aria-label="Open SKILLSETRA AI Coach"><Bot size={18} /><span>AI Coach</span></button>}
    {open && <div className={full ? "ai-fullscreen-wrap" : "ai-popover"}>{content}</div>}
  </>;
}
