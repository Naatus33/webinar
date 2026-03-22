"use client";

import { useRouter } from "next/navigation";

import { NewWebinarForm } from "@/components/new-webinar/NewWebinarForm";

export default function NewWebinarPage() {
  const router = useRouter();

  return <NewWebinarForm onCancel={() => router.push("/dashboard")} />;
}
