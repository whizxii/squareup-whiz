"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { StudyModel, StudyFixture } from "./types";
import { goldenDemo } from "./golden-demo";

interface StudyContextType {
  studies: StudyFixture[];
  activeStudy: StudyFixture | null;
  setActiveStudy: (id: string) => void;
  addStudy: (study: StudyFixture) => void;
  updateStudyModel: (id: string, model: Partial<StudyModel>) => void;
}

const StudyContext = createContext<StudyContextType | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [studies, setStudies] = useState<StudyFixture[]>([goldenDemo]);
  const [activeStudyId, setActiveStudyId] = useState<string>(goldenDemo.study.id);

  const activeStudy = studies.find((s) => s.study.id === activeStudyId) || null;

  const setActiveStudy = useCallback((id: string) => {
    setActiveStudyId(id);
  }, []);

  const addStudy = useCallback((study: StudyFixture) => {
    setStudies((prev) => [...prev, study]);
    setActiveStudyId(study.study.id);
  }, []);

  const updateStudyModel = useCallback(
    (id: string, updates: Partial<StudyModel>) => {
      setStudies((prev) =>
        prev.map((s) =>
          s.study.id === id ? { ...s, study: { ...s.study, ...updates } } : s
        )
      );
    },
    []
  );

  return (
    <StudyContext.Provider
      value={{ studies, activeStudy, setActiveStudy, addStudy, updateStudyModel }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used within StudyProvider");
  return ctx;
}
