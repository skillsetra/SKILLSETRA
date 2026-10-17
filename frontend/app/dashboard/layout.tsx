import type { Metadata } from "next";
export const metadata: Metadata = { title: "Dashboard", description: "Your SKILLSETRA competency and evidence workspace.", alternates: { canonical: "/dashboard" }, robots: { index: false, follow: false } };
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return children; }
