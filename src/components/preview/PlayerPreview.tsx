"use client";

import { useWebinarStore } from "@/store/useWebinarStore";
import { Play } from "lucide-react";

export function PlayerPreview() {
  const { meta } = useWebinarStore();

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
      {meta?.videoUrl ? (
        <iframe
          className="h-full w-full"
          src={videoEmbedSrc(meta.videoUrl)}
          allowFullScreen
          title="Preview do vídeo"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <Play className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-sm text-slate-500">Configure a URL do vídeo nas configurações gerais</p>
        </div>
      )}
    </div>
  );
}

function videoEmbedSrc(url: string): string {
  const u = url.trim();
  if (u.includes("youtu.be") || u.includes("youtube.com")) {
    const id = extractYoutubeId(u);
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : u;
  }
  if (u.includes("vimeo.com")) {
    const id = extractVimeoId(u);
    return id ? `https://player.vimeo.com/video/${id}` : u;
  }
  return u;
}

function extractYoutubeId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match?.[1] ?? "";
}

/** Aceita página do Vimeo (vimeo.com/123) ou URL já no player. */
function extractVimeoId(url: string): string | null {
  const fromPlayer = url.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (fromPlayer) return fromPlayer[1];
  const fromPath = url.match(
    /vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/|showcase\/\d+\/video\/|)(\d+)/,
  );
  return fromPath?.[1] ?? null;
}
