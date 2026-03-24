"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { NewWebinarSidebar, type NewWebinarTab } from "./NewWebinarSidebar";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { AdvancedSettingsTab } from "./AdvancedSettingsTab";
import { RegistrationPageTab } from "./RegistrationPageTab";
import { getTemplateById, getDefaultConfig } from "@/lib/webinar-templates";
import type { Sponsor } from "./SponsorsList";
import { TopicsPicker } from "./TopicsPicker";

export type NewWebinarFormProps = {
  onCancel: () => void;
};

export function NewWebinarForm({ onCancel }: NewWebinarFormProps) {
  const router = useRouter();

  // Template
  const [templateId, setTemplateId] = useState("blank");
  const [step, setStep] = useState<"template" | "form">("template");

  // Formulário
  const [activeTab, setActiveTab] = useState<NewWebinarTab>("general");
  const [saving, setSaving] = useState(false);

  // Configurações gerais
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [useNativeStreaming, setUseNativeStreaming] = useState(false);

  // Configurações avançadas
  const [redirectEnabled, setRedirectEnabled] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [lgpdEnabled, setLgpdEnabled] = useState(false);
  const [lgpdText, setLgpdText] = useState("");

  // Página de cadastro
  const [regBgImage, setRegBgImage] = useState("");
  const [regBgPosition, setRegBgPosition] = useState<{ x: number; y: number }>(() => ({
    x: getDefaultConfig().capturePage?.backgroundPosition?.x ?? 0.5,
    y: getDefaultConfig().capturePage?.backgroundPosition?.y ?? 0.5,
  }));
  const [regLogoUrl, setRegLogoUrl] = useState("");
  const [regDescription, setRegDescription] = useState("");
  const [regTitle, setRegTitle] = useState("");
  const [regCtaText, setRegCtaText] = useState("Ir para o webinar!");
  const [regSponsors, setRegSponsors] = useState<Sponsor[]>([]);

  // Temas
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  const generalValid = name.trim().length > 0 && slug.trim().length > 0;

  function handleAdvancedChange(field: string, value: unknown) {
    switch (field) {
      case "redirectEnabled":
        setRedirectEnabled(value as boolean);
        break;
      case "redirectUrl":
        setRedirectUrl(value as string);
        break;
      case "passwordEnabled":
        setPasswordEnabled(value as boolean);
        break;
      case "password":
        setPassword(value as string);
        break;
      case "replayEnabled":
        setReplayEnabled(value as boolean);
        break;
      case "lgpdEnabled":
        setLgpdEnabled(value as boolean);
        break;
      case "lgpdText":
        setLgpdText(value as string);
        break;
    }
  }

  function handleRegChange(field: string, value: unknown) {
    switch (field) {
      case "regBgImage":
        setRegBgImage(value as string);
        break;
      case "regBgPosition":
        setRegBgPosition(value as { x: number; y: number });
        break;
      case "regLogoUrl":
        setRegLogoUrl(value as string);
        break;
      case "regDescription":
        setRegDescription(value as string);
        break;
      case "regTitle":
        setRegTitle(value as string);
        break;
      case "regCtaText":
        setRegCtaText(value as string);
        break;
      case "regSponsors":
        setRegSponsors(value as Sponsor[]);
        break;
    }
  }

  function handleSelectTemplate(id: string) {
    setTemplateId(id);
  }

  function handleContinueWithTemplate() {
    const tpl = getTemplateById(templateId);
    if (tpl?.config?.content?.title) {
      setRegTitle(tpl.config.content.title);
    }
    setStep("form");
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { preferences?: { lastWebinarTemplateId?: string | null } } | null) => {
        if (cancelled || !d?.preferences?.lastWebinarTemplateId) return;
        const id = d.preferences.lastWebinarTemplateId;
        if (typeof id === "string" && id.trim() && getTemplateById(id)) {
          setTemplateId(id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    if (!generalValid) {
      setActiveTab("general");
      return;
    }

    setSaving(true);
    const tpl = getTemplateById(templateId) ?? { config: getDefaultConfig() };
    const configWithCapturePosition = {
      ...tpl.config,
      capturePage: {
        ...(tpl.config.capturePage ?? getDefaultConfig().capturePage),
        backgroundPosition: regBgPosition,
      },
    };

    const res = await fetch("/api/webinars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        videoUrl,
        startDate: startDate || null,
        startTime: startTime || null,
        useNativeStreaming,
        topicIds: selectedTopicIds,
        redirectEnabled,
        redirectUrl,
        passwordEnabled,
        password,
        replayEnabled,
        lgpdEnabled,
        lgpdText,
        regBgImage,
        regLogoUrl,
        regDescription,
        regTitle,
        regCtaText,
        regSponsors,
        config: configWithCapturePosition,
        templateId,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao criar webinar.");
      return;
    }

    const webinar = await res.json();
    router.push(`/webinar/${webinar.id}/builder`);
  }

  if (step === "template") {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground motion-transition"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
          </div>

          <TemplateGallery selected={templateId} onSelect={handleSelectTemplate} />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 items-center rounded-md border border-border px-5 text-sm text-muted-foreground hover:bg-muted motion-transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleContinueWithTemplate}
              className="flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_rgba(249,177,122,0.25)] hover:brightness-110 motion-transition"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NewWebinarSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        generalValid={generalValid}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep("template")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground motion-transition"
            >
              <ArrowLeft className="h-4 w-4" /> Templates
            </button>
            <span className="text-border">/</span>
            <span className="text-sm text-foreground/90">Novo Webinar</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-8 items-center rounded-md border border-border px-4 text-sm text-muted-foreground hover:bg-muted motion-transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !generalValid}
              className="flex h-8 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_6px_20px_rgba(249,177,122,0.25)] hover:brightness-110 disabled:opacity-60 motion-transition"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Criando..." : "Criar Webinar"}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "general" && (
            <>
              <GeneralSettingsTab
                name={name}
                slug={slug}
                videoUrl={videoUrl}
                startDate={startDate}
                startTime={startTime}
                useNativeStreaming={useNativeStreaming}
                code=""
                onChangeName={setName}
                onChangeSlug={setSlug}
                onChangeVideoUrl={setVideoUrl}
                onChangeStartDate={setStartDate}
                onChangeStartTime={setStartTime}
                onChangeNativeStreaming={setUseNativeStreaming}
              />
              <TopicsPicker
                selectedTopicIds={selectedTopicIds}
                onChangeSelectedTopicIds={setSelectedTopicIds}
              />
            </>
          )}
          {activeTab === "advanced" && (
            <AdvancedSettingsTab
              redirectEnabled={redirectEnabled}
              redirectUrl={redirectUrl}
              passwordEnabled={passwordEnabled}
              password={password}
              replayEnabled={replayEnabled}
              lgpdEnabled={lgpdEnabled}
              lgpdText={lgpdText}
              onChange={handleAdvancedChange}
            />
          )}
          {activeTab === "registration" && (
            <RegistrationPageTab
              bgImage={regBgImage}
              bgPosition={regBgPosition}
              logoUrl={regLogoUrl}
              description={regDescription}
              title={regTitle}
              ctaText={regCtaText}
              sponsors={regSponsors}
              primaryColor={
                getTemplateById(templateId)?.config?.branding?.primaryColor ?? "#7C3AED"
              }
              onChange={handleRegChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

