"use client";

import Sidebar from "@/components/layout/Sidebar";
import TabBar from "@/components/layout/TabBar";
import { StudyProvider } from "@/lib/study-context";
import { useParams } from "next/navigation";

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const studyId = params.id as string;

  return (
    <StudyProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar studyId={studyId} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </StudyProvider>
  );
}
