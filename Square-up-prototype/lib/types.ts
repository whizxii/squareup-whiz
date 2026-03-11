export interface StudyModel {
  id: string;
  title: string;
  brandName: string;
  category: string;
  industry: string;
  targetAudience: string;
  decisionObjective: string;
  stakeholder: string;
  whatChanges: string;
  objectives: Objective[];
  interviewGuide: Question[];
  keyDimensions: Dimension[];
  decisionAreas: string[];
  status: "designing" | "recruiting" | "interviewing" | "analyzing" | "complete";
  progress: { completed: number; total: number };
  updatedAt: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  followUps: string[];
}

export interface Dimension {
  id: string;
  label: string;
}

export interface Theme {
  id: string;
  objectiveId: string;
  dimensionIds: string[];
  title: string;
  summary: string;
  sentiment: { positive: number; neutral: number; negative: number };
  quotes: Quote[];
}

export interface Quote {
  id: string;
  themeId: string;
  respondentId: string;
  text: string;
  dimensionId: string;
}

export interface Recommendation {
  id: string;
  themeIds: string[];
  text: string;
  evidenceCount: number;
}

export interface Respondent {
  id: string;
  name: string;
  age: number;
  city: string;
  persona: string;
  avatarUrl: string;
}

export interface ChartData {
  id: string;
  title: string;
  type: "bar" | "donut";
  items: { label: string; value: number; color?: string }[];
}

export interface AskYourDataResponse {
  id: string;
  prompt: string;
  response: string;
  evidenceTag: string;
}

export interface InterviewExchange {
  role: "ai" | "user";
  text: string;
}

export interface StudyFixture {
  study: StudyModel;
  respondents: Respondent[];
  themes: Theme[];
  recommendations: Recommendation[];
  charts: ChartData[];
  askYourDataResponses: AskYourDataResponse[];
  interviewTranscript: InterviewExchange[];
  executiveSummary: {
    keyTakeaway: string;
    whyItMatters: string;
    confidence: string;
    whyWeBelieveThis: string[];
  };
  whatWeLearned: { objectiveId: string; summary: string }[];
  whatItMeans: string[];
  screenerQuestions: { question: string; options: string[] }[];
}
