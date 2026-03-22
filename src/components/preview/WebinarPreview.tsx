"use client";

import { useWebinarStore } from "@/store/useWebinarStore";
import { PlayerPreview } from "./PlayerPreview";
import { ChatPreview } from "./ChatPreview";
import { OfferButton } from "./OfferButton";
import { ScarcityBanner } from "./ScarcityBanner";
import { ParticipantsCounter } from "./ParticipantsCounter";

export function WebinarPreview() {
  const { config, meta } = useWebinarStore();
  const { layout, branding, content } = config;

  const playerWidth = layout.playerSize === "large" ? "70%" : "60%";

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl text-white"
      style={{ backgroundColor: layout.bgColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="h-7 w-auto object-contain" />
          ) : (
            <div
              className="h-7 w-7 rounded-full"
              style={{ backgroundColor: branding.primaryColor }}
            />
          )}
          <div>
            <p className="text-sm font-semibold leading-none text-white">
              {content.title || meta?.name || "Título do Webinar"}
            </p>
            {content.subtitle && (
              <p className="text-xs text-white/60">{content.subtitle}</p>
            )}
          </div>
        </div>
        <ParticipantsCounter />
      </div>

      {/* Scarcity banner */}
      <ScarcityBanner />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Player */}
        <div
          className="flex-shrink-0 p-3"
          style={{ width: layout.chatPosition === "right" ? playerWidth : `calc(100% - ${playerWidth})` }}
        >
          <PlayerPreview />
        </div>

        {/* Chat */}
        {config.chat.enabled && (
          <div
            className="flex-1 overflow-hidden p-3"
            style={{ minWidth: 0 }}
          >
            <ChatPreview />
          </div>
        )}
      </div>

      {/* Offer button footer */}
      {config.offer.active && config.offer.position === "bottom" && (
        <div className="border-t border-white/10 px-5 py-3">
          <OfferButton />
        </div>
      )}
    </div>
  );
}
