"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Bot } from "lucide-react";

// Keep the voice-recognition/speech-synthesis code out of the initial app
// route bundle. Download the full Coach only after a learner asks to open it.
const PersistentAIWidget = dynamic(() => import("./PersistentAIWidget"), {
  ssr: false,
  loading: () => <div className="ai-fab ai-fab-loading" role="status"><Bot size={18} /><span>Loading AI Coach…</span></div>,
});

export default function PersistentAICoachLoader() {
  const [requested, setRequested] = useState(false);
  if (requested) return <PersistentAIWidget initiallyOpen />;
  return (
    <button
      type="button"
      className="ai-fab"
      onClick={() => setRequested(true)}
      aria-label="Open SKILLSETRA AI Coach"
    >
      <Bot size={18} />
      <span>AI Coach</span>
    </button>
  );
}
