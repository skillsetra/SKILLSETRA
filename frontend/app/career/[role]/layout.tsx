import type { Metadata } from "next";

type Props = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role } = await params;
  const decoded = decodeURIComponent(role);
  const title = `${decoded} Career Competencies | SKILLSETRA`;
  const description = `Review competency areas and evidence-building next steps for the ${decoded} role in SKILLSETRA. Market information is shown only when a current source is available.`;
  const canonical = `/career/${encodeURIComponent(decoded)}`;
  return {
    title, description, alternates: { canonical },
    robots: { index: false, follow: false },
    openGraph: { title, description, url: canonical },
  };
}

export default function CareerRoleLayout({ children }: { children: React.ReactNode }) { return children; }
