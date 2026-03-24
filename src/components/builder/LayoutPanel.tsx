"use client";

import { HexColorPicker } from "react-colorful";
import { useState } from "react";
import { useWebinarStore } from "@/store/useWebinarStore";

export function LayoutPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { layout } = config;
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Layout</h3>
        <p className="text-xs text-slate-500">Posicionamento e aparência geral do webinar.</p>
      </div>

      <div className="space-y-4">
        {/* Posição do chat */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Posição do chat</label>
          <div className="flex gap-2">
            {(["right", "left"] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => updateConfig("layout", { chatPosition: pos })}
                className={`flex-1 rounded-md border py-2 text-sm ${
                  layout.chatPosition === pos
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {pos === "right" ? "Direita" : "Esquerda"}
              </button>
            ))}
          </div>
        </div>

        {/* Tamanho do player */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Tamanho do player</label>
          <div className="flex gap-2">
            {(["large", "medium"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateConfig("layout", { playerSize: size })}
                className={`flex-1 rounded-md border py-2 text-sm ${
                  layout.playerSize === size
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {size === "large" ? "Grande (70%)" : "Médio (60%)"}
              </button>
            ))}
          </div>
        </div>

        {/* Cor de fundo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Cor de fundo</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex h-9 w-full items-center gap-3 rounded-md border border-slate-700 bg-slate-900 px-3"
            >
              <span
                className="h-5 w-5 flex-shrink-0 rounded-full border border-slate-600"
                style={{ backgroundColor: layout.bgColor }}
              />
              <span className="text-sm text-slate-300">{layout.bgColor}</span>
            </button>
            {showColorPicker && (
              <div className="absolute left-0 top-10 z-20 rounded-xl bg-slate-800 p-3 shadow-xl">
                <HexColorPicker
                  color={layout.bgColor}
                  onChange={(c) => updateConfig("layout", { bgColor: c })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
