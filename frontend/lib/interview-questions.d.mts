export type EnglishTrainingLevel = "Beginner" | "Basic" | "Intermediate" | "High" | "Advanced / Industry";
export const ENGLISH_LEVELS: readonly EnglishTrainingLevel[];
export const ENGLISH_QUESTION_BANK: Record<EnglishTrainingLevel, readonly string[]>;
export function normalizeInterviewQuestion(value: string): string;
export function isDuplicateQuestion(candidate: string, previousQuestions?: readonly string[]): boolean;
export function chooseEnglishFallbackQuestion(level: string, round: number, previousQuestions?: readonly string[]): string | null;
