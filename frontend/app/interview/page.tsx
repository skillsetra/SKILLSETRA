"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { useApp } from "../../components/AppProvider";
import { api } from "../../lib/api";
import { runPuter } from "../../lib/ai";
import { chooseEnglishFallbackQuestion, isDuplicateQuestion } from "../../lib/interview-questions.mjs";
import {
  AlertCircle, ArrowRight, Download, FileCheck2, LoaderCircle, LogOut, Mic, Mic2,
  Play, RotateCcw, ShieldCheck, Timer, Printer
} from "lucide-react";

const types = ["Technical", "Coding", "System Design", "Behavioral / HR", "Managerial", "Case Study", "AI / ML", "Embedded Systems", "Mixed"];
const ENGLISH_TRAINING_FOCUS = "English Speaking Training - Round 1 (Untimed)";
const ENGLISH_LEVELS = ["Beginner", "Basic", "Intermediate", "High", "Advanced / Industry"];

const focusAreas = ["Role fundamentals", "Problem solving", "Debugging", "System design", "Communication", "Leadership", "AI / ML", "Embedded C", "Microcontrollers and firmware", "Hardware interfaces (UART/SPI/I²C)", "RTOS and real-time constraints", "Projects / resume", "Security", "Performance", "Mixed", ENGLISH_TRAINING_FOCUS];
const interviewModes = [
  { id: "Live Interview", title: "Live Interview", description: "A natural, adaptive spoken conversation with follow-up questions based on your answers." }
] as const;
const difficulties = ["Beginner", "Intermediate", "Advanced", "Expert"];
const timeOptions = [5, 10, 15, 20, 30, 45];
const languages = [
  { label: "English (India)", name: "English", code: "en-IN" }, { label: "English (US)", name: "English", code: "en-US" },
  { label: "Hindi", name: "Hindi", code: "hi-IN" }, { label: "Gujarati", name: "Gujarati", code: "gu-IN" },
  { label: "Marathi", name: "Marathi", code: "mr-IN" }, { label: "Bengali", name: "Bengali", code: "bn-IN" },
  { label: "Tamil", name: "Tamil", code: "ta-IN" }, { label: "Telugu", name: "Telugu", code: "te-IN" },
  { label: "Punjabi", name: "Punjabi", code: "pa-IN" }, { label: "Kannada", name: "Kannada", code: "kn-IN" },
  { label: "Malayalam", name: "Malayalam", code: "ml-IN" }, { label: "Odia", name: "Odia", code: "or-IN" },
  { label: "Assamese", name: "Assamese", code: "as-IN" }, { label: "Urdu", name: "Urdu", code: "ur-IN" },
  { label: "Nepali", name: "Nepali", code: "ne-NP" }, { label: "Arabic", name: "Arabic", code: "ar-SA" },
  { label: "Chinese (Mandarin)", name: "Chinese", code: "zh-CN" }, { label: "Dutch", name: "Dutch", code: "nl-NL" },
  { label: "Indonesian", name: "Indonesian", code: "id-ID" }, { label: "Italian", name: "Italian", code: "it-IT" },
  { label: "Japanese", name: "Japanese", code: "ja-JP" }, { label: "Korean", name: "Korean", code: "ko-KR" },
  { label: "Polish", name: "Polish", code: "pl-PL" }, { label: "Portuguese (Brazil)", name: "Portuguese", code: "pt-BR" },
  { label: "Russian", name: "Russian", code: "ru-RU" }, { label: "Spanish", name: "Spanish", code: "es-ES" },
  { label: "French", name: "French", code: "fr-FR" }, { label: "German", name: "German", code: "de-DE" },
  { label: "Swahili", name: "Swahili", code: "sw-KE" }, { label: "Turkish", name: "Turkish", code: "tr-TR" },
  { label: "Thai", name: "Thai", code: "th-TH" }, { label: "Vietnamese", name: "Vietnamese", code: "vi-VN" }
];

type FaceState = "idle" | "speaking" | "listening" | "thinking" | "ready";
type InterviewRound = { round: number; question: string; answer: string; evaluation: any; score: number | null; completedAt: string };
type FinalReport = {
  role: string; type: string; mode: string; difficulty: string; language: string; company: string;
  outcome: "SIMULATED SELECTED" | "SIMULATED NOT SELECTED" | "INCOMPLETE" | "ENGLISH PRACTICE COMPLETE";
  overall: number | null; technical: number | null; communication: number | null; leadership: number | null;
  evidence: number | null; claimAlignment: number | null; englishScore: number | null; roundCount: number; plannedRounds: number;
  elapsedSeconds: number; timeLimitMinutes: number; reason: string; gaps: string[]; strengths: string[];
  rounds: InterviewRound[]; createdAt: string; englishTraining: boolean; englishLevel: string;
};

function getRecognitionConstructor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
function splitSpeech(text: string): string[] {
  const sentences = (text || "").replace(/\s+/g, " ").match(/[^.!?。！？]+[.!?。！？]?/g) || [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    let rest = sentence.trim();
    while (rest.length > 200) {
      const pivot = Math.max(rest.lastIndexOf(" ", 200), rest.lastIndexOf(",", 200), rest.lastIndexOf(";", 200));
      const cut = pivot > 90 ? pivot : 200;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
  }
  return chunks.filter(Boolean);
}
function htmlEscape(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function parseStructured(raw: string): any | null {
  try {
    const clean = String(raw).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const first = clean.indexOf("{"); const last = clean.lastIndexOf("}");
    const value = JSON.parse(first >= 0 && last > first ? clean.slice(first, last + 1) : clean);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const scoreKeys = ["overall_score_10", "correctness", "reasoning", "structure", "communication", "leadership", "evidence", "tradeoffs", "behavioral_evidence", "claim_alignment", "english_score_10"];
    const overall = typeof value.overall_score_10 === "number" ? value.overall_score_10 : (typeof value.overall_score_10 === "string" && value.overall_score_10.trim() ? Number(value.overall_score_10) : NaN);
    if (!Number.isFinite(overall) || overall < 0 || overall > 10) return null;
    const normalized: Record<string, unknown> = { ...value, overall_score_10: overall };
    for (const key of scoreKeys) {
      if (key === "overall_score_10") continue;
      const rawScore = value[key];
      const score = typeof rawScore === "number" ? rawScore : (typeof rawScore === "string" && rawScore.trim() ? Number(rawScore) : NaN);
      normalized[key] = Number.isFinite(score) && score >= 0 && score <= 10 ? score : null;
    }
    const arrayKeys = ["strengths", "gaps", "assumptions", "claims_supported", "unsupported_claims", "improved_outline", "english_feedback", "vocabulary_suggestions"];
    for (const key of arrayKeys) {
      const items = Array.isArray(value[key]) ? value[key] : [];
      normalized[key] = items.filter((item: unknown): item is string => typeof item === "string").slice(0, 12).map((item: string) => item.trim().slice(0, 1200)).filter(Boolean);
    }
    for (const key of ["corrected_sentence", "improved_response_example", "follow_up_question", "verdict"]) {
      normalized[key] = typeof value[key] === "string" ? value[key].trim().slice(0, 2000) : "";
    }
    return normalized;
  } catch { return null; }
}
function scoreOf(record: InterviewRound, key: string): number | null {
  const value = record.evaluation?.[key];
  const n = Number(value);
  return value !== null && value !== undefined && Number.isFinite(n) && n >= 0 && n <= 10 ? n * 10 : null;
}
function mean(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return valid.length ? Math.round(valid.reduce((sum, n) => sum + n, 0) / valid.length) : null;
}

export default function Interview() {
  const { user } = useApp();
  const [type, setType] = useState("Technical");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [company, setCompany] = useState("");
  const [focus, setFocus] = useState("Role fundamentals");
  const [englishLevel, setEnglishLevel] = useState("Intermediate");
  const [mode, setMode] = useState<"Live Interview">("Live Interview");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [language, setLanguage] = useState("en-IN");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
  const provider = "puter";
  const model = "openai/gpt-oss-20b";
  
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [session, setSession] = useState("");
  const [round, setRound] = useState(0);
  const [total, setTotal] = useState(5);
  const [history, setHistory] = useState<InterviewRound[]>([]);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [listening, setListening] = useState(false);
  const [manualAnswerMode, setManualAnswerMode] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [faceState, setFaceState] = useState<FaceState>("idle");
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const isEnglishTraining = focus === ENGLISH_TRAINING_FOCUS;
  const activeLanguage = useMemo(() => isEnglishTraining ? (languages.find(x => x.code === "en-IN") || languages[0]) : (languages.find(x => x.code === language) || languages[0]), [isEnglishTraining, language]);
  const recognitionRef = useRef<any>(null);
  const speechRunRef = useRef(0);
  const answerRef = useRef("");
  const recognitionPrefixRef = useRef("");
  const autoEvaluateOnEndRef = useRef(false);
  const evaluateRef = useRef<(answerOverride?: string) => Promise<void>>(async () => {});
  const startRef = useRef<(nextRound?: number) => Promise<void>>(async () => {});
  const finishRef = useRef<(records: InterviewRound[], reason: string) => void>(() => {});
  const historyRef = useRef<InterviewRound[]>([]);
  const listeningRef = useRef(false);
  const busyRef = useRef(false);
  const evaluationInFlightRef = useRef(false);
  const startInFlightRef = useRef(false);
  const timedOutRef = useRef(false);
  const finalizedRef = useRef(false);
  const interviewRootRef = useRef<HTMLDivElement | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const reportSpeechTimerRef = useRef<number | null>(null);
  const recognitionFinalizeTimerRef = useRef<number | null>(null);
  const [immersive, setImmersive] = useState(false);
  const startedAtRef = useRef("");

  historyRef.current = history;
  listeningRef.current = listening;
  busyRef.current = busy;

  function stopRecognitionSilently(updateUi = true) {
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    if (recognitionFinalizeTimerRef.current) window.clearTimeout(recognitionFinalizeTimerRef.current);
    recognitionFinalizeTimerRef.current = null;
    autoEvaluateOnEndRef.current = false;
    const current = recognitionRef.current;
    if (current) {
      // Detach callbacks before stopping: some browsers emit an asynchronous `aborted`/`end`
      // event after a route change or reset. Those stale callbacks must not evaluate a new session.
      current.onresult = null;
      current.onerror = null;
      current.onend = null;
      try { current.abort?.(); } catch { try { current.stop?.(); } catch {} }
      if (recognitionRef.current === current) recognitionRef.current = null;
    }
    listeningRef.current = false;
    if (updateUi) setListening(false);
  }

  useEffect(() => () => {
    stopRecognitionSilently(false);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    speechRunRef.current++;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    if (recognitionFinalizeTimerRef.current) window.clearTimeout(recognitionFinalizeTimerRef.current);
    if (reportSpeechTimerRef.current) window.clearTimeout(reportSpeechTimerRef.current);
  }, []);

  useEffect(() => {
    api<any>("/api/v1/career/roles").then(x => { if (x.current_role) setRole(x.current_role); }).catch(() => {});
  }, []);

  useEffect(() => { const selectedRole = String(user?.targetRole || "").trim(); if (selectedRole) setRole(selectedRole); }, [user?.targetRole]);

  const speakChunks = useCallback((text: string, lang: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setVoiceError("Browser text-to-speech is unavailable. The question is shown so you can continue in typed-answer mode.");
      setManualAnswerMode(true); setFaceState("ready"); return;
    }
    window.speechSynthesis.cancel();
    const run = ++speechRunRef.current;
    const chunks = splitSpeech(text);
    if (!chunks.length) { onDone?.(); return; }
    let index = 0;
    const next = () => {
      if (run !== speechRunRef.current) return;
      if (index >= chunks.length) { setFaceState("ready"); onDone?.(); return; }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = lang; utterance.volume = 1; utterance.rate = 0.92; utterance.pitch = 1.03;
      const voices = window.speechSynthesis.getVoices();
      const base = lang.toLowerCase().split("-")[0];
      const voice = voices.find(v => v.lang.toLowerCase() === lang.toLowerCase())
        || voices.find(v => v.lang.toLowerCase().startsWith(`${base}-`))
        || voices.find(v => v.lang.toLowerCase().startsWith(base));
      if (voice) utterance.voice = voice;
      let settled = false; let watchdog = 0;
      const advance = () => {
        if (settled || run !== speechRunRef.current) return;
        settled = true; if (watchdog) window.clearTimeout(watchdog);
        window.setTimeout(next, 110);
      };
      utterance.onend = advance;
      utterance.onerror = (event: any) => {
        if (event?.error && !["canceled", "interrupted"].includes(event.error)) setVoiceError("The browser speech engine could not play one segment. You can continue or try another language voice.");
        advance();
      };
      try {
        watchdog = window.setTimeout(advance, Math.max(14000, Math.round(chunks[index - 1].length * 145 + 12000)));
        window.speechSynthesis.resume(); window.speechSynthesis.speak(utterance);
      } catch { advance(); }
    };
    setFaceState("speaking"); next();
  }, []);

  const stopSpeaking = useCallback(() => {
    speechRunRef.current++;
    if (reportSpeechTimerRef.current) window.clearTimeout(reportSpeechTimerRef.current);
    reportSpeechTimerRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    if (faceState === "speaking") setFaceState("ready");
  }, [faceState]);


  const startListening = useCallback(() => {
    const Speech = getRecognitionConstructor();
    if (!Speech) {
      setVoiceError("Speech recognition is unavailable in this browser. You can type your answer instead, or try current Chrome or Edge over HTTPS or localhost.");
      setManualAnswerMode(true); setFaceState("ready"); return;
    }
    stopRecognitionSilently();
    try {
      const recognition = new Speech();
      recognition.lang = activeLanguage.code; recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 1;
      recognitionRef.current = recognition; setVoiceError(""); autoEvaluateOnEndRef.current = false; setManualAnswerMode(false);
      recognitionPrefixRef.current = answerRef.current.trim();
      recognition.onresult = (event: any) => {
        let combined = "";
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item?.[0]?.transcript && (item.isFinal || i >= event.resultIndex)) combined += `${item[0].transcript} `;
        }
        combined = [recognitionPrefixRef.current, combined.trim()].filter(Boolean).join(" ").trim();
        answerRef.current = combined; setAnswer(combined);
        // Automatically submit a spoken answer after a natural pause; no stop-speech button is required.
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        if (combined) silenceTimerRef.current = window.setTimeout(() => {
          if (!listeningRef.current || busyRef.current || autoEvaluateOnEndRef.current) return;
          autoEvaluateOnEndRef.current = true;
          setFaceState("thinking");
          try { recognitionRef.current?.stop(); }
          catch { autoEvaluateOnEndRef.current = false; void evaluateRef.current(answerRef.current.trim()); }
        }, 2300);
      };
      recognition.onerror = (event: any) => {
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        const reason = event?.error;
        // Some browsers emit `aborted` when we intentionally stop recognition to
        // submit an answer. Do not overwrite the evaluation state with a false error.
        if (reason === "aborted" && (autoEvaluateOnEndRef.current || busyRef.current)) return;
        setListening(false); setFaceState("ready");
        setVoiceError(reason === "not-allowed" || reason === "service-not-allowed"
          ? "Microphone access was denied. Allow microphone permission in your browser, then retry."
          : reason === "language-not-supported" ? `Speech recognition does not support ${activeLanguage.label} on this device. Change the interview language and retry.`
          : reason === "no-speech" ? "No speech was detected. Check the microphone and try again, or type your answer instead."
          : `Speech recognition stopped${reason ? ` (${reason})` : ""}. Retry the microphone or type your answer instead.`);
        if (reason === "not-allowed" || reason === "service-not-allowed" || reason === "language-not-supported") setManualAnswerMode(true);
      };
      recognition.onend = () => {
        setListening(false);
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        if (autoEvaluateOnEndRef.current) {
          autoEvaluateOnEndRef.current = false; setFaceState("thinking");
          recognitionFinalizeTimerRef.current = window.setTimeout(() => {
            recognitionFinalizeTimerRef.current = null;
            const finalAnswer = answerRef.current.trim();
            if (finalAnswer) void evaluateRef.current(finalAnswer);
            else if (timedOutRef.current) finishRef.current(historyRef.current, "time-limit");
            else { setFaceState("ready"); setVoiceError("No final transcript was captured. Try speaking again."); }
          }, 220);
        } else setFaceState("ready");
      };
      recognition.start();
      listeningRef.current = true; setListening(true); setFaceState("listening");
    } catch (error: any) {
      listeningRef.current = false;
      setListening(false); setFaceState("ready");
      setVoiceError(error?.message || "Could not start speech recognition. Check microphone permission and retry.");
    }
  }, [activeLanguage.code, activeLanguage.label]);

  const finishInterview = useCallback((records: InterviewRound[], reason: string) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    stopRecognitionSilently();
    setListening(false); stopSpeaking(); setStarted(false); setInterviewFinished(true); setFaceState("ready"); setImmersive(false);
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    const root = interviewRootRef.current;
    if (typeof document !== "undefined" && document.fullscreenElement && root && document.fullscreenElement === root) void document.exitFullscreen().catch(() => {});
    const scored = records.filter(x => x.evaluation && Number.isFinite(Number(x.evaluation.overall_score_10)));
    const overall = mean(scored.map(x => Number(x.evaluation.overall_score_10) * 10));
    const technical = mean(scored.map(x => mean([scoreOf(x, "correctness"), scoreOf(x, "reasoning"), scoreOf(x, "tradeoffs")] )).filter((x): x is number => x !== null));
    const communication = mean(scored.map(x => scoreOf(x, "communication")));
    const leadership = mean(scored.map(x => scoreOf(x, "leadership") ?? mean([scoreOf(x, "behavioral_evidence"), scoreOf(x, "structure")])).filter((x): x is number => x !== null));
    const evidence = mean(scored.map(x => scoreOf(x, "evidence")));
    const claimAlignment = mean(scored.map(x => scoreOf(x, "claim_alignment")));
    const englishScore = mean(scored.map(x => scoreOf(x, "english_score_10")));
    let outcome: FinalReport["outcome"] = "INCOMPLETE";
    if (isEnglishTraining && scored.length) outcome = "ENGLISH PRACTICE COMPLETE";
    else if (isEnglishTraining) outcome = "INCOMPLETE";
    else if (scored.length) outcome = (overall !== null && overall >= 70 && (technical === null || technical >= 60) && (communication === null || communication >= 60) && (leadership === null || leadership >= 55)) ? "SIMULATED SELECTED" : "SIMULATED NOT SELECTED";
    const allGaps = [...new Set(scored.flatMap(x => Array.isArray(x.evaluation.gaps) ? x.evaluation.gaps : []))].slice(0, 12);
    const allStrengths = [...new Set(scored.flatMap(x => Array.isArray(x.evaluation.strengths) ? x.evaluation.strengths : []))].slice(0, 12);
    const report: FinalReport = {
      role, type, mode, difficulty, language: activeLanguage.label, company,
      outcome, overall, technical, communication, leadership, evidence, claimAlignment, englishScore,
      roundCount: scored.length, plannedRounds: total, elapsedSeconds: seconds, timeLimitMinutes: isEnglishTraining ? 0 : timeLimitMinutes, englishTraining: isEnglishTraining, englishLevel,
      reason: reason === "time-limit" ? "Interview ended at the selected time limit." : reason === "user-ended" ? "Interview was ended early by the candidate; the report includes completed scored answers only." : scored.length < total ? "Interview ended before all planned rounds were completed." : "All planned interview rounds were completed.",
      gaps: allGaps, strengths: allStrengths, rounds: records, createdAt: new Date().toISOString()
    };
    setFinalReport(report); setEvaluation(null); setQuestion("");
    const englishFeedback = scored.flatMap(item => Array.isArray(item.evaluation?.english_feedback) ? item.evaluation.english_feedback : []).slice(0, 3);
    const spoken = reason === "user-ended"
      ? isEnglishTraining
        ? `You ended English speaking practice at the ${englishLevel} level. ${scored.length ? `${overall === null ? "A numeric score was unavailable." : `Your practice score is ${overall} percent.`} ${englishFeedback[0] ? `One thing to improve: ${englishFeedback[0]}.` : "Review your report for sentence improvements."}` : "No spoken answer was scored in this session."} Your report is ready to review.`
        : `You ended the interview. ${scored.length ? `${overall === null ? `${scored.length} answers were scored.` : `Your overall practice score is ${overall} percent.`} ${allStrengths[0] ? `A strength noted was ${allStrengths[0]}.` : "Review the strengths in your report."} ${allGaps[0] ? `A priority gap is ${allGaps[0]}.` : "Review the recommendations in your report."}` : "There were no completed scored answers, so the report is marked incomplete."} Your interview report is ready. This is practice feedback, not an employer decision.`
      : isEnglishTraining && scored.length
        ? `Your English speaking practice is complete at the ${englishLevel} level. ${overall === null ? "A numeric practice score was unavailable for this session." : `Your practice score is ${overall} percent.`} ${englishFeedback[0] ? `One thing to improve: ${englishFeedback[0]}.` : "Review your downloadable report for sentence improvements and vocabulary suggestions."} Keep practicing and try the next level when you feel ready.`
        : isEnglishTraining
          ? "Your English practice ended before a spoken answer could be scored. Start another round, check the microphone permission, and answer the interviewer aloud."
          : outcome === "SIMULATED SELECTED"
            ? `The interview simulation is complete. Your simulated result is selected, with an overall score of ${overall} percent. Download your report to review the detailed rubric and recommended improvements. This is practice feedback, not a real employer decision.`
            : outcome === "SIMULATED NOT SELECTED"
              ? `The interview simulation is complete. Your simulated result is not selected in this practice round, with an overall score of ${overall} percent. This is a learning signal, not a real employer decision. Download your report to review the gaps and prepare for another attempt.`
              : `The interview simulation ended before there was enough scored evidence to make a useful outcome recommendation. Download the partial report and repeat the interview when ready.`;
    if (reason !== "question-generation-failed") {
      reportSpeechTimerRef.current = window.setTimeout(() => {
        reportSpeechTimerRef.current = null;
        speakChunks(spoken, activeLanguage.code);
      }, 180);
    }
  }, [activeLanguage.code, activeLanguage.label, company, difficulty, englishLevel, isEnglishTraining, language, mode, role, seconds, speakChunks, stopSpeaking, timeLimitMinutes, total, type]);
  finishRef.current = finishInterview;

  // A single wall-clock limit applies to the complete interview rather than resetting for each question.
  useEffect(() => {
    if (!started || interviewFinished) return;
    const id = window.setInterval(() => {
      setSeconds(current => {
        const next = isEnglishTraining ? current + 1 : Math.min(current + 1, timeLimitMinutes * 60);
        if (!isEnglishTraining && next >= timeLimitMinutes * 60 && !timedOutRef.current && !finalizedRef.current) {
          // Mark timeout synchronously so the 1-second interval cannot enqueue duplicate finalizers.
          timedOutRef.current = true;
          window.setTimeout(() => {
            if (finalizedRef.current) return;
            if (listeningRef.current && answerRef.current.trim()) {
              autoEvaluateOnEndRef.current = true;
              try { recognitionRef.current?.stop(); } catch { void evaluateRef.current(answerRef.current.trim()); }
            } else if (busyRef.current) {
              // The active evaluation completion handler finalizes the report when it returns.
            } else if (answerRef.current.trim() && question) {
              void evaluateRef.current(answerRef.current.trim());
            } else finishRef.current(historyRef.current, "time-limit");
          }, 0);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, interviewFinished, timeLimitMinutes, question, isEnglishTraining]);

  // The interviewer speaks each new question before automatically opening the microphone.
  useEffect(() => {
    if (!question || !started || timedOutRef.current || finalizedRef.current) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      speakChunks(question, activeLanguage.code, () => {
        if (!cancelled && !timedOutRef.current) window.setTimeout(() => {
          if (!cancelled && !timedOutRef.current) startListening();
        }, 240);
      });
    }, 160);
    return () => {
      cancelled = true; window.clearTimeout(timer); speechRunRef.current++;
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      stopRecognitionSilently();
    };
  }, [question, started, activeLanguage.code, speakChunks, startListening]);

  async function start(nextRound = 1): Promise<void> {
    if (finalizedRef.current || startInFlightRef.current) return;
    startInFlightRef.current = true;
    stopRecognitionSilently();
    setListening(false); stopSpeaking(); setBusy(true); setProviderError(""); setVoiceError(""); setFaceState("thinking");
    try {
      const response = await api<any>("/api/v1/interview/start", {
        method: "POST",
        body: JSON.stringify({ role, interview_type: type, level, language: activeLanguage.name, provider, model, company, focus, mode, difficulty, question_number: nextRound, total_questions: total, english_training: isEnglishTraining, english_level: englishLevel, time_limit_minutes: isEnglishTraining ? 0 : timeLimitMinutes, previous_question: historyRef.current[historyRef.current.length - 1]?.question || "", previous_answer: mode === "Live Interview" ? historyRef.current[historyRef.current.length - 1]?.answer || "" : "", previous_questions: historyRef.current.map(item => item.question).slice(-20) })
      });
      if (response.mode === "unavailable") throw new Error(response.notice || "AI assistance is unavailable. Check your connection and retry.");
      let nextQuestion = response.question || "";
      if (response.mode === "puter-client" && response.prompt) nextQuestion = await runPuter(response.prompt, response.model || model);
      nextQuestion = nextQuestion.trim();
      const priorQuestions = historyRef.current.map(item => item.question);
      if (isEnglishTraining && (!nextQuestion || isDuplicateQuestion(nextQuestion, priorQuestions))) {
        nextQuestion = chooseEnglishFallbackQuestion(englishLevel, nextRound, priorQuestions) || "";
        if (!nextQuestion) {
          throw new Error(`No fresh ${englishLevel} English-practice question is available for this session. Your completed answers are preserved in a partial report. Start a new session to continue practicing.`);
        }
      } else if (!nextQuestion) {
        throw new Error("The interviewer returned an empty question. Check the AI service and retry.");
      } else if (isDuplicateQuestion(nextQuestion, priorQuestions)) {
        throw new Error("The AI interviewer returned a question that is too similar to one already asked. Your completed answers are preserved in a partial report. Retry with a new interview to avoid repeating the question.");
      }
      if (!nextQuestion.trim()) throw new Error("The interviewer could not prepare a valid question. Please start a new session.");
      if (timedOutRef.current || finalizedRef.current) { finishRef.current(historyRef.current, "time-limit"); return; }
      if (nextRound === 1) {
        finalizedRef.current = false; timedOutRef.current = false; startedAtRef.current = new Date().toISOString();
        historyRef.current = []; setHistory([]); setFinalReport(null); setInterviewFinished(false); setSeconds(0); setDownloadError("");
      }
      setQuestion(nextQuestion.trim()); setSession(response.session_id || ""); setEvaluation(null); setAnswer(""); answerRef.current = ""; recognitionPrefixRef.current = "";
      autoEvaluateOnEndRef.current = false; setRound(nextRound); setStarted(true); setFaceState("ready");
      window.requestAnimationFrame(() => {
        const root = interviewRootRef.current;
        if (root) root.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    } catch (error: any) {
      setQuestion(""); setFaceState("idle"); setImmersive(false);
      const root = interviewRootRef.current;
      if (typeof document !== "undefined" && document.fullscreenElement && root && document.fullscreenElement === root) void document.exitFullscreen().catch(() => {});
      const message = error?.message || "Unable to start the interview. Check the AI service connection.";
      setProviderError(message);
      if (nextRound > 1 && historyRef.current.length && !finalizedRef.current) {
        setStarted(false);
        finishRef.current(historyRef.current, "question-generation-failed");
      }
    } finally { setBusy(false); startInFlightRef.current = false; }
  }
  startRef.current = start;

  async function evaluate(answerOverride?: string): Promise<void> {
    if (evaluationInFlightRef.current) return;
    const responseText = (answerOverride ?? answer).trim();
    if (!session || !question.trim()) { setProviderError("No active interview question is available. Start a new interview."); return; }
    if (!responseText) { setVoiceError("No answer was captured. Please answer before continuing."); return; }
    evaluationInFlightRef.current = true;
    autoEvaluateOnEndRef.current = false;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    stopRecognitionSilently();
    setListening(false); setBusy(true); setVoiceError(""); setFaceState("thinking");
    try {
      const response = await api<any>("/api/v1/interview/evaluate", {
        method: "POST",
        body: JSON.stringify({ session_id: session, question, answer: responseText, language: activeLanguage.name, provider, model, role, competency: isEnglishTraining ? "Communication" : focus, interview_type: type, difficulty, mode, english_training: isEnglishTraining, english_level: englishLevel })
      });
      if (response.mode === "unavailable") throw new Error(response.notice || "AI assistance is unavailable. Check the connection and retry.");
      let data = response;
      if (response.mode === "puter-client" && response.prompt) {
        const raw = await runPuter(response.prompt, response.model || model);
        const structured = parseStructured(raw);
        let progressUpdate: any = null;
        if (structured) {
          const overall = Math.max(0, Math.min(100, Math.round(Number(structured.overall_score_10) * 10)));
          const toPercent = (v: unknown): number | null => {
            if (v === null || v === undefined || v === "") return null;
            const numeric = Number(v);
            return Number.isFinite(numeric) && numeric >= 0 && numeric <= 10 ? Math.max(0, Math.min(100, Math.round(numeric * 10))) : null;
          };
          const dimensions = [
            { competency: isEnglishTraining ? "Communication" : focus, score: overall, answered: 1, total: 1 },
            { competency: "Reasoning", score: toPercent(structured.reasoning), answered: 1, total: 1 },
            { competency: "Communication", score: toPercent(structured.communication), answered: 1, total: 1 },
            { competency: "Leadership", score: toPercent(structured.leadership ?? structured.behavioral_evidence), answered: 1, total: 1 },
            { competency: "Evidence", score: toPercent(structured.evidence), answered: 1, total: 1 },
            ...(isEnglishTraining ? [{ competency: "English Communication", score: toPercent(structured.english_score_10 ?? structured.communication), answered: 1, total: 1 }] : [])
          ].filter((item): item is { competency: string; score: number; answered: number; total: number } => item.score !== null);
          try {
            progressUpdate = await api<any>("/api/v1/practice/record-result", { method: "POST", body: JSON.stringify({ source: "interview-practice", title: isEnglishTraining ? `English speaking practice · ${englishLevel}` : `${type} interview · ${focus}`, score: overall, competency_scores: dimensions, role, competency: isEnglishTraining ? "Communication" : focus }) });
          } catch (error: any) { setVoiceError(`Feedback was generated, but saving to Analytics failed: ${error?.message || "save failed"}`); }
        }
        data = { mode: "live", evaluation: raw, structured, provider: "puter", progress_update: progressUpdate, practice_saved: Boolean(progressUpdate) };
      }
      const structured = data.structured || parseStructured(String(data.evaluation || ""));
      if (!structured) throw new Error("The AI service returned feedback that did not match the scoring rubric. Retry this answer so no invalid score is added.");
      const record: InterviewRound = {
        round, question, answer: responseText, evaluation: structured,
        score: Math.max(0, Math.min(100, Math.round(Number(structured.overall_score_10) * 10))), completedAt: new Date().toISOString()
      };
      const nextHistory = [...historyRef.current, record]; historyRef.current = nextHistory; setHistory(nextHistory); setEvaluation(data); setAnswer(""); answerRef.current = ""; recognitionPrefixRef.current = "";
      if (timedOutRef.current || round >= total) {
        setBusy(false);
        finishRef.current(nextHistory, timedOutRef.current ? "time-limit" : "completed");
        return;
      }
      setEvaluation(null);
      const englishCorrection = String(structured.corrected_sentence || structured.improved_response_example || "").trim().slice(0, 260);
      const englishFeedback = Array.isArray(structured.english_feedback) ? String(structured.english_feedback[0] || "").trim().slice(0, 220) : "";
      const transition = isEnglishTraining
        ? `${englishFeedback ? `A quick coaching tip: ${englishFeedback}. ` : "Good effort. Focus on a clear opening, one main idea, and a short example. "}${englishCorrection ? `A more natural way to say part of that is: ${englishCorrection}. ` : "Try to use complete sentences and clear linking words. "}${round < total ? "Let us practice another English speaking question." : "That completes the English speaking round."}`
        : mode === "Live Interview"
          ? "Thank you. I have considered your answer. Let me ask a follow-up question."
          : "Response recorded. Let us continue to the next question in the assessment.";
      speakChunks(transition, activeLanguage.code, () => {
        if (!timedOutRef.current && !finalizedRef.current) void startRef.current(round + 1);
      });
    } catch (error: any) {
      const message = error?.message || "Evaluation could not be completed. Retry the answer.";
      setProviderError(message); setFaceState("ready");
      setVoiceError(message); setAnswer(responseText); answerRef.current = responseText; setManualAnswerMode(true);
    } finally { setBusy(false); evaluationInFlightRef.current = false; }
  }
  evaluateRef.current = evaluate;


  function finishSpokenAnswer() {
    if (!listeningRef.current || busyRef.current) return;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    const finalText = answerRef.current.trim();
    if (!finalText) {
      setVoiceError("I did not capture an answer yet. Speak again or switch to typed answer mode.");
      try { recognitionRef.current?.stop(); } catch {}
      setListening(false); setFaceState("ready");
      return;
    }
    autoEvaluateOnEndRef.current = true;
    setFaceState("thinking");
    try { recognitionRef.current?.stop(); }
    catch { autoEvaluateOnEndRef.current = false; void evaluateRef.current(finalText); }
  }

  function submitTypedAnswer() {
    const text = answer.trim();
    if (!text || busyRef.current || evaluationInFlightRef.current) return;
    answerRef.current = text;
    setVoiceError("");
    setManualAnswerMode(false);
    void evaluateRef.current(text);
  }

  function switchToTypedAnswer() {
    stopSpeaking();
    autoEvaluateOnEndRef.current = false;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
    setManualAnswerMode(true);
    setFaceState("ready");
    setVoiceError("");
  }

  function repeatQuestion() {
    if (!question || busy) return;
    setVoiceError("");
    if (listeningRef.current) stopRecognitionSilently();
    setListening(false);
    setFaceState("speaking");
    speakChunks(question, activeLanguage.code, () => {
      if (started && !manualAnswerMode && !timedOutRef.current) startListening();
    });
  }

  function beginInterview() {
    // A completed/partial report must not leave the finalization guard blocking a new session.
    if (interviewFinished || finalizedRef.current) reset();
    // Avoid competing microphone/speech sessions from the persistent AI Coach.
    window.dispatchEvent(new CustomEvent("skillsetra:stop-voice"));
    // Trigger browser fullscreen directly inside the user gesture, then start the voice session.
    setImmersive(true);
    const root = interviewRootRef.current as (HTMLDivElement & { requestFullscreen?: () => Promise<void> }) | null;
    try { const request = root?.requestFullscreen?.(); request?.catch(() => {}); } catch { /* CSS immersive fallback remains enabled. */ }
    void start(1);
  }

  function endInterviewEarly() {
    if (typeof window !== "undefined" && !window.confirm("End this interview now and create a report from the completed answers?")) return;
    timedOutRef.current = false;
    autoEvaluateOnEndRef.current = false;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    stopRecognitionSilently();
    finishRef.current(historyRef.current, "user-ended");
  }

  function reset() {
    stopRecognitionSilently();
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    const root = interviewRootRef.current;
    if (typeof document !== "undefined" && document.fullscreenElement && root && document.fullscreenElement === root) void document.exitFullscreen().catch(() => {});
    setImmersive(false);
    if (reportSpeechTimerRef.current) window.clearTimeout(reportSpeechTimerRef.current);
    reportSpeechTimerRef.current = null;
    stopSpeaking(); finalizedRef.current = false; timedOutRef.current = false; historyRef.current = [];
    setQuestion(""); setAnswer(""); answerRef.current = ""; recognitionPrefixRef.current = ""; setEvaluation(null); setHistory([]); setSession(""); setRound(0); setStarted(false); setManualAnswerMode(false); autoEvaluateOnEndRef.current = false;
    setInterviewFinished(false); setFinalReport(null); setSeconds(0); setListening(false); setVoiceError(""); setProviderError(""); setFaceState("idle"); setDownloadError("");
  }

  function reportHtml(report: FinalReport): string {
    const metrics: Array<[string, number | null]> = [["Overall performance", report.overall], ["Technical correctness and reasoning", report.technical], ["Communication (transcript-based)", report.communication], ["Leadership / behavioral evidence", report.leadership], ["Evidence", report.evidence], ["Claim alignment", report.claimAlignment]];
    if (report.englishTraining) metrics.unshift(["English communication / clarity (transcript-based)", report.englishScore]);
    const roundRows = report.rounds.map(item => {
      const coach = [item.evaluation?.corrected_sentence, item.evaluation?.improved_response_example, ...(Array.isArray(item.evaluation?.english_feedback) ? item.evaluation.english_feedback : []), ...(Array.isArray(item.evaluation?.vocabulary_suggestions) ? item.evaluation.vocabulary_suggestions : [])].filter(Boolean).join("; ");
      return `<tr><td>${item.round}</td><td>${htmlEscape(item.evaluation?.overall_score_10 == null ? "Not scored" : `${Math.round(Number(item.evaluation.overall_score_10) * 10)}%`)}</td><td>${htmlEscape(item.question)}</td><td>${htmlEscape(item.answer)}</td><td>${htmlEscape((item.evaluation?.gaps || []).join("; "))}</td>${report.englishTraining ? `<td>${htmlEscape(coach)}</td>` : ""}</tr>`;
    }).join("");
    const metricRows = metrics.map(([name, value]) => `<tr><th>${htmlEscape(name)}</th><td>${value === null ? "Not scored" : `${value}%`}</td></tr>`).join("");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Skillsetra Interview Report</title><style>body{font:15px/1.55 Arial,sans-serif;color:#172033;max-width:1000px;margin:36px auto;padding:0 22px}h1,h2{color:#1c478c}.outcome{padding:16px;border:2px solid #4277c5;border-radius:12px;font-size:22px;font-weight:700}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{text-align:left;vertical-align:top;padding:9px;border:1px solid #d9e1ee;white-space:pre-wrap}small,.muted{color:#53647c}.notice{background:#f1f5fb;padding:12px;border-radius:8px}</style></head><body><h1>SKILLSETRA · Voice Interview Report</h1><p class="muted">Generated ${htmlEscape(report.createdAt)} · Target role: ${htmlEscape(report.role)} · Language: ${htmlEscape(report.language)}</p><div class="outcome">${htmlEscape(report.outcome)}${report.overall === null ? "" : ` · ${report.overall}% overall`}</div><p>${htmlEscape(report.reason)} ${report.englishTraining ? `English speaking training level: ${htmlEscape(report.englishLevel)}. Time limit: none.` : `Time limit: ${report.timeLimitMinutes} minutes.`} Completed scored rounds: ${report.roundCount}/${report.plannedRounds}. Elapsed: ${Math.floor(report.elapsedSeconds / 60)}m ${report.elapsedSeconds % 60}s.</p><h2>Score receipt</h2><table>${metricRows}</table><h2>Strengths observed</h2><ul>${(report.strengths.length ? report.strengths : ["No scored strengths were available."]).map(x => `<li>${htmlEscape(x)}</li>`).join("")}</ul><h2>Priority gaps</h2><ul>${(report.gaps.length ? report.gaps : ["No explicit gaps were returned by the evaluator."]).map(x => `<li>${htmlEscape(x)}</li>`).join("")}</ul>${report.englishTraining ? `<h2>English speaking training · ${htmlEscape(report.englishLevel)}</h2><p>Review the per-round coaching notes and improved phrasing below. Scores are transcript-based practice signals and cannot measure accent or pronunciation from text alone.</p>` : ""}<h2>Round-by-round review</h2><table><thead><tr><th>Round</th><th>Score</th><th>Question</th><th>Answer transcript</th><th>Gaps</th>${report.englishTraining ? "<th>English coaching</th>" : ""}</tr></thead><tbody>${roundRows}</tbody></table><p class="notice"><b>Important:</b> This is AI-generated practice feedback based on the recorded transcript and selected rubric, not a real employer decision, verified credential, identity check, or assessment of facial expression, body language, accent, or vocal confidence. Browser-generated scoring can be incomplete or incorrect; independently verify important claims.</p></body></html>`;
  }
  function downloadReport() {
    if (!finalReport) return;
    try {
      const blob = new Blob([reportHtml(finalReport)], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `Skillsetra-Interview-${finalReport.role.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); setDownloadError("");
    } catch { setDownloadError("The report could not be downloaded in this browser. Try Print / Save PDF instead."); }
  }
  function printReport() {
    if (!finalReport) return;
    try {
      const blob = new Blob([reportHtml(finalReport)], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob); const popup = window.open(url, "_blank");
      if (!popup) { URL.revokeObjectURL(url); setDownloadError("The browser blocked the report window. Allow pop-ups or download the HTML report."); return; }
      try { popup.opener = null; } catch {}
      window.setTimeout(() => { try { popup.print(); } catch {} URL.revokeObjectURL(url); }, 700);
    } catch { setDownloadError("Could not open the report print view. Download the HTML report instead."); }
  }

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  const remaining = Math.max(0, timeLimitMinutes * 60 - seconds);
  const remainingLabel = `${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;

  return <AppLayout><div ref={interviewRootRef} className={`page interview-page${immersive ? " is-immersive" : ""}`}>
    {!immersive && <div className="page-head"><div><div className="eyebrow">AI Interviewer · Voice-first</div><h1>Practice the room before the room.</h1><p>Start a live voice conversation. Select “English Speaking Training - Round 1 (Untimed)” in the competency focus to practice spoken English at your own level with no clock.</p></div><button className="button" onClick={reset}><RotateCcw size={14}/> Reset</button></div>}
    <div className="interview-layout">
      {!immersive && <section className="panel interview-setup"><div className="panel-head"><div><Mic2/><h2>Live Interview setup</h2></div><ShieldCheck/></div>
        <div className="interview-choice-grid" role="group" aria-label="Interview type">
          {interviewModes.map(option => <button type="button" key={option.id} className={`interview-choice ${mode === option.id ? "active" : ""}`} aria-pressed={mode === option.id} onClick={() => setMode(option.id)} disabled={started}><span className="interview-choice-icon">{option.id === "Live Interview" ? <Mic2 size={22}/> : <ShieldCheck size={22}/>}</span><span><b>{option.title}</b><small>{option.description}</small></span><span className="interview-choice-mark">{mode === option.id ? "Selected" : "Choose"}</span></button>)}
        </div>
        <div className="field"><label htmlFor="interview-role">Target role</label><input id="interview-role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. AI Engineer" disabled={started}/></div>
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="interview-type">Interview category</label><select id="interview-type" value={type} onChange={e => setType(e.target.value)} disabled={started}>{types.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="interview-company">Company / context</label><input id="interview-company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional context" disabled={started}/></div>
        <div className="grid grid-2" style={{ marginTop: 10 }}><div className="field"><label htmlFor="interview-level">Seniority</label><select id="interview-level" value={level} onChange={e => setLevel(e.target.value)} disabled={started}>{["Entry", "Intermediate", "Senior", "Lead"].map(x => <option key={x}>{x}</option>)}</select></div><div className="field"><label htmlFor="interview-difficulty">Difficulty</label><select id="interview-difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)} disabled={started}>{difficulties.map(x => <option key={x}>{x}</option>)}</select></div></div>
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="interview-language">Interview language</label><select id="interview-language" value={isEnglishTraining ? "en-IN" : language} onChange={e => { setLanguage(e.target.value); setVoiceError(""); }} disabled={started || isEnglishTraining}><optgroup label="Indian languages">{languages.filter(x => x.code.includes("IN")).map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</optgroup><optgroup label="Other languages">{languages.filter(x => !x.code.includes("IN")).map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</optgroup></select></div>
        {isEnglishTraining ? <div className="signal good" style={{ marginTop: 10 }}><b>Untimed English Speaking · Round 1</b><span>The session continues until you finish it. The interviewer speaks English and gives level-matched coaching after your answers.</span></div> : <div className="field" style={{ marginTop: 10 }}><label htmlFor="interview-time-limit">Time limit</label><select id="interview-time-limit" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(Number(e.target.value))} disabled={started}>{timeOptions.map(n => <option key={n} value={n}>{n} minutes</option>)}</select></div>}
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="interview-rounds">Number of questions</label><select id="interview-rounds" value={total} onChange={e => setTotal(Number(e.target.value))} disabled={started}><option value={1}>1 · Quick practice</option><option value={3}>3 · Short session</option><option value={5}>5 · Full session</option><option value={10}>10 · Deep session</option><option value={15}>15 · Extended session</option></select></div>
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="interview-focus">Primary competency focus</label><select id="interview-focus" value={focus} onChange={e => { setFocus(e.target.value); setVoiceError(""); }} disabled={started}>{focusAreas.map(x => <option key={x}>{x}</option>)}</select></div>
        {isEnglishTraining && <div className="field english-training-level" style={{ marginTop: 10 }}><label htmlFor="english-training-level">Your current English level</label><select id="english-training-level" value={englishLevel} onChange={e => setEnglishLevel(e.target.value)} disabled={started}>{ENGLISH_LEVELS.map(x => <option key={x}>{x}</option>)}</select><p className="muted">Beginner and Basic use shorter prompts. Intermediate and High add workplace conversation. Advanced / Industry uses professional scenarios, precise phrasing, negotiation and role-specific vocabulary.</p></div>}
        <div className="field" style={{ marginTop: 10 }}><label>AI interviewer</label><div className="signal good"><b>AI interviewer ready</b><span>Interview questions and answer transcripts are sent to the AI service to generate feedback. Avoid sharing sensitive information you do not want processed.</span></div></div>
        {providerError && <div className="error" role="alert" style={{ marginTop: 12 }}>{providerError}</div>}{voiceError && <div className="notice" role="status" style={{ marginTop: 12 }}>{voiceError}</div>}
        <button className="button primary" style={{ width: "100%", marginTop: 16 }} onClick={beginInterview} disabled={busy || !role.trim()}><Play size={15}/> {busy ? "Preparing interviewer…" : `Start ${mode.toLowerCase()}`}</button>
        <p className="muted interview-disclaimer">Voice-first session. Speech recognition works best in supported browsers over HTTPS. If voice input is unavailable, you can type your answer. Transcripts are included in the report you choose to download.</p>
      </section>}

      <section className={`panel interview-session${immersive ? " immersive-session" : ""}`} aria-label="Voice interview session">
        <div className="interview-session-top"><div><div className="eyebrow">{mode}{isEnglishTraining ? " · ENGLISH TRAINING" : ""}</div><h2>{isEnglishTraining ? "English Speaking Training" : `${type} · ${role}`}</h2><p>{isEnglishTraining ? `${englishLevel} level · English · Untimed · Round ${round || 0}/${total}` : `${difficulty} · ${activeLanguage.label} · Round ${round || 0}/${total}`}</p></div>{started && !isEnglishTraining && <div className={`tag ${remaining < 60 ? "warn" : "good"}`}><Timer size={12}/> {remainingLabel} remaining</div>}</div>
        <div className={`interviewer-visual state-${faceState}`} aria-live="polite"><div className={`interviewer-signal-wrap state-${faceState}`} role="img" aria-label={`AI interviewer audio signal ${faceState}`}><div className="interviewer-signal-core" aria-hidden="true"><span/></div><div className="interviewer-signal-bars" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{animationDelay:`${i*65}ms`}}/>)}</div></div><div className="interviewer-visual-copy">{mode === "Live Interview" && <span className="interview-live-indicator"><i aria-hidden="true"/> LIVE CONVERSATION</span>}<b>{busy && !started ? "Preparing your interview" : faceState === "speaking" ? "Interviewer speaking" : faceState === "listening" ? "Listening to your answer" : faceState === "thinking" ? "Considering your response" : faceState === "ready" ? "Ready for your answer" : "Your interviewer is ready"}</b><small>{faceState === "listening" ? (isEnglishTraining ? `Speak in English at your ${englishLevel} level; a short pause submits your answer.` : `Speak naturally in ${activeLanguage.label}; a short pause submits your answer.`) : faceState === "speaking" ? (isEnglishTraining ? "Listen to the English prompt and respond in your own words." : "Read the question below while you listen, then answer aloud.") : faceState === "thinking" ? (isEnglishTraining ? "Preparing feedback on clarity, phrasing and your next speaking challenge." : "Reviewing your response against the selected rubric.") : "Voice-first interview · typed fallback available."}</small><div className="interviewer-wave" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 42}ms` }}/>)}</div></div></div>
        {immersive && busy && !started && <div className="interview-live-status" role="status"><LoaderCircle className="spin" size={20}/> Preparing the interviewer…</div>}
        {started && question && <section className="interview-question-live" aria-live="polite" aria-label="Current interview question"><div><span className="eyebrow">CURRENT QUESTION · READ ALONG</span><button type="button" className="button interview-repeat-inline" onClick={repeatQuestion} disabled={busy || !question}><RotateCcw size={13}/> Repeat question</button></div><p>{question}</p></section>}
        {started && <div className={`interview-voice-answer${listening ? " active" : ""}`} aria-label="Interview response controls"><div className={`interview-mic-orb state-${faceState}`}><Mic size={26}/></div><b>{manualAnswerMode ? "Type your answer" : listening ? "Your turn — speak now" : faceState === "thinking" ? "Reviewing your answer…" : faceState === "speaking" ? "Interviewer is asking…" : "Getting ready for the next question…"}</b><small>{isEnglishTraining ? `English practice · ${englishLevel} · ${mm}:${ss} elapsed · no time limit` : `Question ${round} of ${total} · ${mm}:${ss} elapsed`}</small><p>{manualAnswerMode ? "Voice input is unavailable or you chose to type. The current question is shown below." : listening ? "Pause naturally to submit automatically, or use Finish answer to submit immediately." : "Listen to the question, then answer aloud. You can replay it or switch to typing."}</p>{manualAnswerMode && <div className="interview-typed-fallback"><label htmlFor="interview-typed-answer">Your answer</label><textarea id="interview-typed-answer" rows={5} value={answer} onChange={e => { setAnswer(e.target.value); answerRef.current = e.target.value; }} placeholder="Type your answer here…" disabled={busy} /><div className="action-row"><button type="button" className="button primary" onClick={submitTypedAnswer} disabled={busy || !answer.trim()}>{busy ? "Evaluating…" : "Submit answer"}</button><button type="button" className="button" onClick={() => { setAnswer(""); answerRef.current = ""; setManualAnswerMode(false); startListening(); }} disabled={busy || listening}><Mic size={14}/> Switch to voice input</button></div></div>}{voiceError && <div className="notice" role="alert">{voiceError}<button type="button" className="button" onClick={startListening} disabled={busy || listening} style={{ marginLeft: 8 }}><Mic size={13}/> Retry microphone</button></div>}<div className="interview-session-actions">{!manualAnswerMode && <><button type="button" className="button" onClick={switchToTypedAnswer} disabled={busy}>Type answer</button>{listening && <button type="button" className="button primary" onClick={finishSpokenAnswer} disabled={busy}><Mic size={14}/> Finish answer</button>}</>}<button type="button" className="button danger" onClick={endInterviewEarly} disabled={busy}><LogOut size={14}/> End interview</button></div></div>}
        {immersive && !started && providerError && <div className="error" role="alert">{providerError}<button type="button" className="button" onClick={reset}>Return to setup</button></div>}
        {interviewFinished && finalReport && <div className="interview-final-report" style={{ marginTop: 18 }}><div className="panel-head"><div><div className="eyebrow">Interview complete · downloadable report</div><h2>{finalReport.englishTraining ? "English Practice Report" : "Simulation outcome"}</h2></div><FileCheck2/></div><div className={`interview-outcome ${finalReport.outcome === "SIMULATED SELECTED" ? "is-selected" : finalReport.outcome === "SIMULATED NOT SELECTED" ? "is-not-selected" : finalReport.outcome === "ENGLISH PRACTICE COMPLETE" ? "is-english-practice" : "is-incomplete"}`}>{finalReport.outcome.replace("SIMULATED ", "").replace("INCOMPLETE", "INCOMPLETE")}{finalReport.overall !== null && <strong>{finalReport.overall}%</strong>}</div><p className="muted">{finalReport.reason} {finalReport.englishTraining ? "This report summarizes English speaking practice and transcript-based coaching; it is not an employment decision." : "This is a practice simulation, not an actual employer decision."}</p><div className="grid grid-3">{finalReport.englishTraining ? <><article className="metric-card"><span className="eyebrow">English clarity</span><strong>{finalReport.englishScore === null ? "—" : `${finalReport.englishScore}%`}</strong></article><article className="metric-card"><span className="eyebrow">Communication</span><strong>{finalReport.communication === null ? "—" : `${finalReport.communication}%`}</strong></article><article className="metric-card"><span className="eyebrow">Overall practice</span><strong>{finalReport.overall === null ? "—" : `${finalReport.overall}%`}</strong></article></> : <><article className="metric-card"><span className="eyebrow">Technical / reasoning</span><strong>{finalReport.technical === null ? "—" : `${finalReport.technical}%`}</strong></article><article className="metric-card"><span className="eyebrow">Communication</span><strong>{finalReport.communication === null ? "—" : `${finalReport.communication}%`}</strong></article><article className="metric-card"><span className="eyebrow">Leadership / behavioral</span><strong>{finalReport.leadership === null ? "—" : `${finalReport.leadership}%`}</strong></article></>}</div><div className="grid grid-2" style={{ marginTop: 12 }}><div className="signal"><b>Strengths from the transcript</b><span>{finalReport.strengths.join(" · ") || "No strengths were returned by the scoring model."}</span></div><div className="signal warn"><b>Priority gaps</b><span>{finalReport.gaps.join(" · ") || "No explicit gaps were returned. Review the individual answers in the downloaded report."}</span></div></div>{finalReport.englishTraining && <div className="english-training-feedback" style={{ marginTop: 14 }}><h3>English learning notes · {finalReport.englishLevel}</h3>{finalReport.rounds.map(item => { const tips = [item.evaluation?.corrected_sentence, item.evaluation?.improved_response_example, ...(Array.isArray(item.evaluation?.english_feedback) ? item.evaluation.english_feedback : []), ...(Array.isArray(item.evaluation?.vocabulary_suggestions) ? item.evaluation.vocabulary_suggestions : [])].filter(Boolean).map(String); return <div className="english-training-feedback-round" key={item.round}><b>Round {item.round}</b><p>{tips.length ? tips.join(" · ") : "practice answering with a clear opening, one main idea, and a concise example."}</p></div>; })}</div>}<div className="action-row" style={{ marginTop: 14 }}><button type="button" className="button primary" onClick={downloadReport}><Download size={15}/> Download interview report</button><button type="button" className="button" onClick={printReport}><Printer size={15}/> Print / save as PDF</button><button type="button" className="button secondary" onClick={reset}><RotateCcw size={14}/> New interview</button></div>{downloadError && <p className="error" role="alert">{downloadError}</p>}<div className="notice" style={{ marginTop: 12 }}><AlertCircle size={15}/> {finalReport.englishTraining ? "English scores are practice signals based on speech-to-text. The system cannot score pronunciation or accent reliably from a transcript." : "Scores are generated from the interview transcript and selected rubric. A “selected” outcome means only that the configured practice threshold was met; it does not prove employment readiness or verify claims."}</div></div>}
        {!immersive && !started && !interviewFinished && <div className="empty"><Mic2 size={30}/><h3>Ready for a Live Interview?</h3><p>The interviewer speaks first, displays each question while speaking, listens for your answer, then continues. The final report becomes available when the interview ends.</p></div>}
      </section>
    </div>
  </div></AppLayout>;

}
