import type { Metadata } from "next";
export const metadata: Metadata = { title: "Project Defense Practice", description: "Practice explaining project decisions, alternatives, trade-offs and verification plans.", alternates: { canonical: "/projects/defense" }, robots: { index: false, follow: false } };
export default function LegacyProjectDefenseLayout({ children }: { children: React.ReactNode }) { return children; }
