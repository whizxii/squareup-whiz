"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { Company360Page } from "@/components/crm/company360/Company360Page";

export default function CompanyPage() {
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

  return <Company360Page companyId={params.id} onBack={handleBack} />;
}
