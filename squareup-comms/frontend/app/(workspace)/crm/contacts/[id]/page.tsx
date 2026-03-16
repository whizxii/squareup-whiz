"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { Contact360Page } from "@/components/crm/contact360/Contact360Page";

export default function ContactPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.push("/crm");
  }, [router]);

  // Keyboard: Esc to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey) {
        handleBack();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleBack]);

  if (!params.id) {
    return null;
  }

  return <Contact360Page contactId={params.id} onBack={handleBack} />;
}
