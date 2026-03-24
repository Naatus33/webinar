"use client";

import { useWebinarStore } from "@/store/useWebinarStore";
import { 
  Monitor, Heart, Bell, Layout, 
  Zap, MessageCircle, Users, Sparkles 
} from "lucide-react";

export function RoomSettingsTab() {
  const { config, updateConfig } = useWebinarStore();

  const toggleAmbilight = () => {
    updateConfig("layout", { ambilight: !config.layout.ambilight });
  };

  const toggleReactions = () => {
    updateConfig("reactions", { enabled: !config.reactions.enabled });
  };

  const toggleSocialProof = () => {
    updateConfig("socialProof", { enabled: !config.socialProof.enabled });
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Configurações da Sala</h3>
        <p className="text-sm text-slate-400">Controle quais funcionalidades estarão ativas para seus espectadores.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ambilight */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Efeito Ambilight</p>
                <p className="text-[10px] text-slate-500">Luz ambiente dinâmica no fundo</p>
              </div>
            </div>
            <button
              onClick={toggleAmbilight}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.layout.ambilight ? 'bg-primary' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.layout.ambilight ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Reações */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Reações ao Vivo</p>
                <p className="text-[10px] text-slate-500">Emojis flutuantes sobre o vídeo</p>
              </div>
            </div>
            <button
              onClick={toggleReactions}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.reactions.enabled ? 'bg-primary' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.reactions.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Prova Social */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Prova Social</p>
                <p className="text-[10px] text-slate-500">Pop-ups de novos inscritos</p>
              </div>
            </div>
            <button
              onClick={toggleSocialProof}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.socialProof.enabled ? 'bg-primary' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.socialProof.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Chat */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Chat Interativo</p>
                <p className="text-[10px] text-slate-500">Habilitar conversa entre alunos</p>
              </div>
            </div>
            <button
              onClick={() => updateConfig("chat", { enabled: !config.chat.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.chat.enabled ? 'bg-primary' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.chat.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Customização de Prova Social */}
      {config.socialProof.enabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Personalizar Prova Social</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nomes (um por linha)</label>
              <textarea
                value={config.socialProof.fakeNames.join('\n')}
                onChange={(e) => updateConfig("socialProof", { fakeNames: e.target.value.split('\n').filter(Boolean) })}
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-primary/50 transition-all"
                placeholder="Ex: João S."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Cidades (uma por linha)</label>
              <textarea
                value={config.socialProof.fakeCities.join('\n')}
                onChange={(e) => updateConfig("socialProof", { fakeCities: e.target.value.split('\n').filter(Boolean) })}
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-primary/50 transition-all"
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
