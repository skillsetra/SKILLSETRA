export type AIInsightKind = "good" | "warn" | "risk" | "next" | "info";
export type AIInsightSection = { title: string; kind: AIInsightKind; items: string[] };
export type AIInsightData = { title: string; sections: AIInsightSection[] };
export function cleanAIText(value: string): string;
export function parseAIInsight(value: string): AIInsightData;
