"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface SocialProofPopupProps {
  config: WebinarConfig;
  webinarId: string;
}

interface Lead {
  id: string;
  name: string;
  createdAt: string;
}

export function SocialProofPopup({ config, webinarId }: SocialProofPopupProps) {
  const { socialProof } = config;
  const [visible, setVisible] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [realLeads, setRealLeads] = useState<Lead[]>([]);
  const [leadIndex, setLeadIndex] = useState(0);

  // Carregar leads reais se o modo for "real"
  useEffect(() => {
    if (!socialProof.enabled || socialProof.mode !== "real") return;
    fetch(`/api/webinars/${webinarId}/leads-recent`)
      .then((r) => r.json())
      .then((data) => setRealLeads(data ?? []))
      .catch(() => {});
  }, [socialProof.enabled, socialProof.mode, webinarId]);

  useEffect(() => {
    if (!socialProof.enabled) return;

    const show = () => {
      const name =
        socialProof.mode === "fake"
          ? socialProof.fakeNames[Math.floor(Math.random() * socialProof.fakeNames.length)]
          : realLeads[leadIndex % (realLeads.length || 1)]?.name ?? socialProof.fakeNames[0];

      setCurrentName(name ?? "Alguém");
      setVisible(true);
      setLeadIndex((i) => i + 1);

      setTimeout(() => setVisible(false), socialProof.duration * 1000);
    };

    const interval = setInterval(show, socialProof.frequency * 1000);
    return () => clearInterval(interval);
  }, [socialProof, realLeads, leadIndex]);

  if (!visible || !socialProof.enabled) return null;

  const positionClass =
    socialProof.position === "bottom-left"
      ? "bottom-4 left-4"
      : socialProof.position === "bottom-right"
      ? "bottom-4 right-4"
      : "top-4 left-4";

  return (
    <div
      className={`fixed ${positionClass} z-50 flex animate-fade-in items-center gap-3 rounded-xl border border-border/60 bg-card/95 px-4 py-3 text-foreground shadow-2xl backdrop-blur-sm ring-1 ring-border/40`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <User className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold">{currentName}</p>
        <p className="text-[10px] text-muted-foreground">acabou de se inscrever ✓</p>
      </div>
    </div>
  );
}
