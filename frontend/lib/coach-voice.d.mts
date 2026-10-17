export const COACH_LANGS: Readonly<Record<string, string>>;
export function recognitionLocales(languageName: string): string[];
export function normalizeUnavailableRecognitionLanguages(value: unknown): string[];
export function selectableRecognitionLanguages(unavailable?: unknown[]): string[];
export function recognitionErrorMessage(code: string, languageName: string): string;
