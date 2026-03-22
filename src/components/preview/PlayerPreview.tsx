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
          src={
            meta.videoUrl.includes("youtube")
              ? `https://www.youtube.com/embed/${extractYoutubeId(meta.videoUrl)}?rel=0`
              : meta.videoUrl
          }
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

function extractYoutubeId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match?.[1] ?? "";
}
