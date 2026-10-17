"use client";

type Props = { provider: string; model: string; onProvider: (value: string) => void; onModel: (value: string) => void };

/** Keeps AI configuration internal while retaining the shared feature layout. */
export default function AIControls(_props: Props) {
  return <div className="ai-controls ai-controls-compact" aria-label="AI assistance status">
    <div className="signal good"><b>AI assistance ready</b><span>The service is managed automatically for a consistent experience.</span></div>
  </div>;
}
