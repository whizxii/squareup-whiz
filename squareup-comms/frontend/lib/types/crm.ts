// ─── CRM TypeScript Types ──────────────────────────────────────────
// All interfaces defined upfront. Fields filled in per phase.

// ─── Core Entities ─────────────────────────────────────────────────

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  company_id?: string;
  title?: string;
  avatar_url?: string;
  stage: CRMStage;
  lifecycle_stage: LifecycleStage;
  stage_changed_at: string;
  value?: number;
  currency: string;
  source?: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  notes?: string;
  last_contacted_at?: string;
  next_follow_up_at?: string;
  follow_up_note?: string;
  owner_id?: string;
  last_activity_at?: string;
  activity_count: number;
  lead_score: number;
  relationship_strength: number;

  // AI intelligence fields (populated by ChatIntelligenceService)
  ai_summary?: string;
  last_ai_analysis_at?: string;
  ai_tags?: string[];
  sentiment_score?: number; // -1.0 (negative) to 1.0 (positive)

  is_archived: boolean;
  created_by?: string;
  created_by_type: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  website?: string;
  logo_url?: string;
  description?: string;
  social_profiles: SocialProfiles;
  annual_revenue?: number;
  employee_count?: number;
  enrichment_data: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title: string;
  contact_id: string;
  company_id?: string;
  pipeline_id: string;
  stage: string;
  value?: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  status: DealStatus;
  loss_reason?: string;
  loss_reason_detail?: string;
  owner_id?: string;
  stage_entered_at: string;
  days_in_stage: number;
  deal_health: DealHealth;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  is_default: boolean;
  is_archived: boolean;
  created_by?: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  label: string;
  order: number;
  color: string;
  probability: number;
  sla_days: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_by?: string;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  deal_id?: string;
  content: string;
  is_pinned: boolean;
  mentions: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── Activities ────────────────────────────────────────────────────

export interface Activity {
  id: string;
  contact_id: string;
  type: ActivityType;
  title?: string;
  content?: string;
  activity_metadata?: Record<string, unknown>;
  performed_by?: string;
  performer_type?: "user" | "agent";
  performer_name?: string;
  message_id?: string;
  agent_execution_id?: string;
  chat_signal_id?: string;
  chat_context?: string; // JSON: channel_id, message snippet, signal metadata
  created_at: string;
}

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "deal_update"
  | "agent_action"
  | "follow_up"
  | "recording"
  | "enrichment"
  | "score_update"
  | "calendar_event"
  | "email_sent"
  | "email_received"
  | "email_opened"
  | "form_submitted"
  | "page_visited"
  | "workflow_triggered"
  | "chat_mention"
  | "chat_deal_signal"
  | "chat_action_item"
  | "chat_meeting_request"
  | "chat_follow_up";

// ─── Chat Intelligence ──────────────────────────────────────────────

export type ChatSignalType =
  | "contact_mention"
  | "deal_signal"
  | "action_item"
  | "sentiment"
  | "meeting_request"
  | "follow_up";

export interface ChatSignal {
  id: string;
  message_id: string;
  channel_id: string;
  sender_id: string;
  signal_type: ChatSignalType;
  entity_type?: string;
  entity_id?: string;
  confidence: number;
  extracted_data: Record<string, unknown>;
  ai_reasoning?: string;
  processed: boolean;
  created_at?: string;
}

// ─── Calendar ──────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  contact_id: string;
  deal_id?: string;
  title: string;
  event_type: CalendarEventType;
  description?: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location?: string;
  meeting_url?: string;
  external_event_id?: string;
  external_calendar_id?: string;
  attendees: CalendarAttendee[];
  reminder_minutes: number;
  status: CalendarEventStatus;
  outcome?: "positive" | "neutral" | "negative";
  outcome_notes?: string;
  is_auto_created: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type CalendarEventType =
  | "follow_up"
  | "meeting"
  | "call"
  | "demo"
  | "onboarding";

export type CalendarEventStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export interface CalendarAttendee {
  email: string;
  name?: string;
  response_status: "accepted" | "declined" | "tentative" | "needsAction";
}

// ─── Recordings & Transcription ────────────────────────────────────

export interface CallRecording {
  id: string;
  contact_id: string;
  deal_id?: string;
  calendar_event_id?: string;
  title: string;
  duration_seconds: number;
  file_url: string;
  file_size_bytes: number;
  transcript?: string;
  transcript_segments: TranscriptSegment[];
  ai_summary?: string;
  ai_action_items: ActionItem[];
  ai_sentiment?: "positive" | "neutral" | "negative" | "mixed";
  ai_key_topics: KeyTopic[];
  ai_objections: Objection[];
  ai_next_steps: string[];
  transcription_status: TranscriptionStatus;
  created_by?: string;
  created_at: string;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

export interface ActionItem {
  text: string;
  assignee?: string;
  due_date?: string;
  is_completed: boolean;
}

export interface KeyTopic {
  topic: string;
  relevance_score: number;
}

export interface Objection {
  text: string;
  context: string;
  resolved: boolean;
}

export type TranscriptionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// ─── AI Models ─────────────────────────────────────────────────────

export interface ContactEnrichment {
  id: string;
  contact_id: string;
  linkedin_url?: string;
  twitter_url?: string;
  github_url?: string;
  bio?: string;
  headline?: string;
  location?: string;
  timezone?: string;
  education: Education[];
  work_history: WorkHistory[];
  skills: string[];
  interests: string[];
  mutual_connections: string[];
  company_news: string[];
  confidence_score: number;
  enriched_at: string;
  source: string;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  year?: number;
}

export interface WorkHistory {
  company: string;
  title: string;
  start?: string;
  end?: string;
  current: boolean;
}

export interface LeadScore {
  id: string;
  contact_id: string;
  overall_score: number;
  fit_score: number;
  engagement_score: number;
  intent_score: number;
  score_breakdown: ScoreBreakdown;
  ai_reasoning: string;
  score_trend: "rising" | "stable" | "falling";
  previous_score: number;
  scored_at: string;
}

export interface ScoreBreakdown {
  fit: ScoreFactor[];
  engagement: ScoreFactor[];
  intent: ScoreFactor[];
}

export interface ScoreFactor {
  factor: string;
  points: number;
  detail?: string;
}

export interface RelationshipStrength {
  id: string;
  contact_id: string;
  strength: number;
  interaction_count: number;
  last_interaction_at?: string;
  avg_response_time_hours: number;
  sentiment_trend: "warming" | "stable" | "cooling";
  sentiment_score: number;
  communication_frequency:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "inactive";
  factors: RelationshipFactor[];
  calculated_at: string;
}

export interface RelationshipFactor {
  type: string;
  weight: number;
  detail: string;
}

export interface DealRisk {
  id: string;
  deal_id: string;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number;
  risk_factors: RiskFactor[];
  predicted_outcome: "win" | "lose" | "stall";
  predicted_close_date?: string;
  confidence: number;
  ai_reasoning: string;
  assessed_at: string;
}

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
}

export interface MeetingPrep {
  event_id: string;
  contact_summary: string;
  company_overview: string;
  deal_status?: string;
  recent_interactions: string[];
  open_action_items: ActionItem[];
  talking_points: string[];
  potential_objections: string[];
  relationship_strength: number;
  prepared_at: string;
}

export interface FollowUpSuggestion {
  contact_id: string;
  action: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  suggested_date?: string;
}

// ─── Workflows & Automation ────────────────────────────────────────

export interface SmartList {
  id: string;
  name: string;
  description?: string;
  criteria: SmartListCriteria[];
  sort_by?: string;
  sort_order?: "asc" | "desc";
  columns: string[];
  is_shared: boolean;
  auto_refresh: boolean;
  member_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SmartListCriteria {
  field: string;
  operator: CriteriaOperator;
  value: unknown;
  conjunction: "and" | "or";
}

export type CriteriaOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "is_empty"
  | "is_not_empty"
  | "in_list"
  | "not_in_list"
  | "date_before"
  | "date_after"
  | "date_in_last_days";

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  is_active: boolean;
  execution_count: number;
  last_executed_at?: string;
  created_by?: string;
  created_at: string;
}

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  conditions: WorkflowCondition[];
}

export type WorkflowTriggerType =
  | "contact.created"
  | "deal.stage_changed"
  | "activity.logged"
  | "score.changed"
  | "field.updated"
  | "date.reached"
  | "manual";

export interface WorkflowCondition {
  field: string;
  operator: CriteriaOperator;
  value: unknown;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  params: Record<string, unknown>;
}

export type WorkflowActionType =
  | "update_field"
  | "create_activity"
  | "send_email"
  | "enroll_sequence"
  | "create_task"
  | "send_notification"
  | "assign_owner"
  | "add_tag"
  | "move_stage"
  | "webhook";

// ─── Emails ───────────────────────────────────────────────────────

export type EmailDirection = "inbound" | "outbound";

export type EmailStatus =
  | "draft"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "replied";

export interface Email {
  id: string;
  contact_id: string;
  deal_id?: string;
  direction: EmailDirection;
  subject?: string;
  body_html?: string;
  body_text?: string;
  from_address: string;
  to_addresses: string;
  cc_addresses: string;
  thread_id?: string;
  external_message_id?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced: boolean;
  status: EmailStatus;
  sequence_id?: string;
  sequence_step?: number;
  sent_at?: string;
  received_at?: string;
  created_by?: string;
  created_at?: string;
}

export interface EmailSendPayload {
  contact_id: string;
  deal_id?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  from_address?: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  thread_id?: string;
  sequence_id?: string;
  sequence_step?: number;
}

export interface EmailReceivePayload {
  contact_id: string;
  deal_id?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  from_address: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  thread_id?: string;
  external_message_id?: string;
  received_at?: string;
}

export interface EmailFilters {
  contact_id?: string;
  deal_id?: string;
  direction?: EmailDirection;
  status?: EmailStatus;
  thread_id?: string;
  sequence_id?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// ─── Email Sequences ───────────────────────────────────────────────

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  contact_name?: string;
  current_step: number;
  status: "active" | "completed" | "replied" | "unenrolled" | "bounced";
  enrolled_at: string;
  completed_at?: string;
  next_send_at?: string;
  created_at: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  status: "active" | "paused" | "archived";
  total_enrolled: number;
  total_completed: number;
  total_replied: number;
  created_by?: string;
  created_at: string;
}

export interface SequenceStep {
  order: number;
  delay_days: number;
  delay_hours: number;
  template_subject: string;
  template_body: string;
  send_on_reply: "stop" | "continue";
}

// ─── Contact 360 Aggregate ─────────────────────────────────────────

export interface Contact360Response {
  contact: Contact;
  company?: Company;
  deals: Deal[];
  activities: Activity[];
  notes: ContactNote[];
  tags: Tag[];
  enrichment?: ContactEnrichment;
  lead_score?: LeadScore;
  relationship?: RelationshipStrength;
  recordings: CallRecording[];
  calendar_events: CalendarEvent[];
  follow_up_suggestions: FollowUpSuggestion[];
}

export interface TimelineEntry {
  id: string;
  type: ActivityType | "note" | "email" | "recording" | "calendar";
  title: string;
  content?: string;
  timestamp: string;
  performer?: string;
  performer_type?: "user" | "agent";
  entity_id: string;
  entity_type: string;
}

// ─── Company 360 Aggregate ────────────────────────────────────────

export interface Company360PipelineSummary {
  total_pipeline_value: number;
  total_won_value: number;
  avg_deal_value: number;
  open_count: number;
  won_count: number;
  lost_count: number;
  total_count: number;
  win_rate: number;
}

export interface Company360ContactSummary {
  total_count: number;
  avg_lead_score: number;
}

export interface Company360Response {
  company: Company;
  contacts: Contact[];
  deals: Deal[];
  pipeline_summary: Company360PipelineSummary;
  contact_summary: Company360ContactSummary;
}

// ─── Analytics ─────────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_contacts: number;
  new_contacts_period: number;
  total_pipeline_value: number;
  weighted_pipeline_value: number;
  deals_won_period: number;
  win_rate: number;
  avg_deal_size: number;
  avg_days_to_close: number;
}

export interface PipelineMetrics {
  stages: StageMetric[];
  total_value: number;
  total_deals: number;
  velocity_days: number;
}

export interface StageMetric {
  stage_id: string;
  stage_label: string;
  deal_count: number;
  total_value: number;
  avg_days_in_stage: number;
  conversion_rate: number;
}

export interface RevenueForecast {
  period: string;
  actual: number;
  forecast: number;
  confidence_low: number;
  confidence_high: number;
}

export interface WinLossAnalytics {
  won_count: number;
  lost_count: number;
  won_value: number;
  lost_value: number;
  win_rate: number;
  avg_won_cycle_days: number;
  avg_lost_cycle_days: number;
  loss_reasons: { reason: string; count: number; value: number }[];
}

export interface StageDurationMetric {
  stage_id: string;
  stage_label: string;
  avg_days: number;
  max_days: number;
  sla_days: number | null;
}

export interface DealVelocity {
  deals_created: number;
  deals_closed: number;
  win_rate: number;
  avg_value: number;
  avg_cycle_days: number;
  velocity: number;
}

export interface LeadSourceMetric {
  source: string;
  contacts: number;
  deals: number;
  revenue: number;
  conversion_rate: number;
}

export interface ActivityAnalytics {
  by_type: Record<string, number>;
  daily: { date: string; count: number }[];
  total_30d: number;
  avg_per_day: number;
}

// ─── Cross-Deal Patterns ────────────────────────────────────────────

export interface CrossDealPattern {
  pattern: string;
  detail: string;
  impact: string;
  action: string;
}

export interface CrossDealPatternsResponse {
  id: string | null;
  type: string;
  severity: string;
  title: string;
  description: string;
  ai_reasoning: string;
  suggested_actions: string[];
  patterns: CrossDealPattern[];
  win_rate: number | null;
  avg_cycle_days: number | null;
  top_segment: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  is_acted_on: boolean;
  created_at: string;
}

// ─── Automation Logs ─────────────────────────────────────────────────

export type AutomationLogStatus =
  | "auto_executed"
  | "pending_review"
  | "approved"
  | "rejected";

export interface AutomationLogEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  confidence: number;
  status: AutomationLogStatus;
  performed_by: string;
  result: string | null;
  review_notes: string | null;
  ai_reasoning: string | null;
  source_event: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// ─── AI Insights ─────────────────────────────────────────────────────

export interface AIInsightEntry {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  ai_reasoning: string;
  suggested_actions: string[];
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  target_user_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  is_acted_on: boolean;
  created_at: string;
  highlight: string | null;
  risk_score: number | null;
}

// ─── UI / Views ────────────────────────────────────────────────────

export interface CustomView {
  id: string;
  name: string;
  view_type: "table" | "kanban" | "list";
  entity_type: "contacts" | "deals" | "companies";
  filters: Record<string, unknown>;
  sort: SortConfig[];
  group_by?: string;
  columns: string[];
  is_default: boolean;
  is_shared: boolean;
  created_by?: string;
  created_at: string;
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface BulkOperation {
  operation: "stage_change" | "tag_add" | "tag_remove" | "owner_assign" | "archive" | "enroll_sequence";
  entity_ids: string[];
  params: Record<string, unknown>;
}

export interface ImportMapping {
  csv_column: string;
  crm_field: string;
  transform?: "none" | "lowercase" | "titlecase";
}

// ─── API Generics ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
  prev_cursor: string | null;
  total_count: number;
  has_more: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: Record<string, unknown> | null;
}

// ─── Notifications ─────────────────────────────────────────────────

export interface CRMNotification {
  id: string;
  user_id: string;
  type: CRMNotificationType;
  title: string;
  body: string;
  entity_type?: string;
  entity_id?: string;
  priority: "low" | "medium" | "high" | "urgent";
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  created_at: string;
}

export type CRMNotificationType =
  | "deal_risk"
  | "follow_up_due"
  | "score_changed"
  | "meeting_prep"
  | "enrichment_complete"
  | "deal_won"
  | "deal_lost"
  | "mention"
  | "assignment"
  | "workflow_triggered";

// ─── Enums / Constants ─────────────────────────────────────────────

export type CRMStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LifecycleStage =
  | "subscriber"
  | "lead"
  | "mql"
  | "sql"
  | "opportunity"
  | "customer"
  | "evangelist";

export type CompanySize =
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "500+";

export type DealStatus = "open" | "won" | "lost";

export type DealHealth = "green" | "yellow" | "red";

export interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  crunchbase?: string;
}

export type CRMView =
  | "dashboard"
  | "pipeline"
  | "table"
  | "calendar"
  | "analytics"
  | "leads"
  | "companies"
  | "sequences"
  | "workflows"
  | "smart_lists"
  | "automation"
  | "digest"
  | "graph";

export const STAGES: { id: CRMStage; label: string; color: string }[] = [
  { id: "lead", label: "Lead", color: "bg-gray-400" },
  { id: "qualified", label: "Qualified", color: "bg-blue-500" },
  { id: "proposal", label: "Proposal", color: "bg-yellow-500" },
  { id: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { id: "won", label: "Won", color: "bg-green-500" },
  { id: "lost", label: "Lost", color: "bg-red-500" },
];

export const LIFECYCLE_STAGES: { id: LifecycleStage; label: string }[] = [
  { id: "subscriber", label: "Subscriber" },
  { id: "lead", label: "Lead" },
  { id: "mql", label: "MQL" },
  { id: "sql", label: "SQL" },
  { id: "opportunity", label: "Opportunity" },
  { id: "customer", label: "Customer" },
  { id: "evangelist", label: "Evangelist" },
];

// ─── Morning Briefing ─────────────────────────────────────────

export interface BriefingItem {
  category: "deal_risk" | "stale_contact" | "hot_lead" | "meeting" | "action";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  entity_id: string | null;
  entity_type: "contact" | "deal" | "event" | null;
  actions: string[];
}

export interface PipelineSummary {
  open_deals: number;
  total_pipeline_value: number;
  avg_deal_value: number;
  won_this_month: number;
  won_value_this_month: number;
}

export interface MeetingSummary {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  event_type: string;
  contact_id: string;
  status: string;
}

export interface MorningBriefing {
  greeting: string;
  date: string;
  attention_items: BriefingItem[];
  pipeline_summary: PipelineSummary;
  todays_meetings: MeetingSummary[];
  hot_leads_count: number;
  stale_contacts_count: number;
  at_risk_deals_count: number;
}

// ─── Attention Items (banner alerts) ───────────────────────────

export interface AttentionItem {
  id: string;
  type:
    | "deal_at_risk"
    | "deal_stale"
    | "contact_cold"
    | "task_overdue"
    | "missing_follow_up";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  entity_type: "deal" | "contact" | "task";
  entity_id: string;
  entity_name: string;
  metadata: Record<string, unknown>;
}

export interface AttentionItemsResponse {
  items: AttentionItem[];
  count: number;
  generated_at: string;
}

// ─── Email Drafts (AI auto-drafted) ─────────────────────────────

export interface EmailDraft {
  id: string;
  contact_id: string;
  deal_id: string | null;
  subject: string;
  body_html: string;
  body_text: string;
  status: "draft";
  sequence_id: string | null;
  sequence_step: number | null;
  created_at: string;
  created_by: string | null;
}

export interface EmailDraftResult {
  draft_id: string;
  subject: string;
  body_html: string;
  body_text: string;
  trigger: string;
  contact_id: string;
  deal_id: string | null;
}

// ─── AI Feedback ──────────────────────────────────────────────────

export type AIFeedbackRating = "thumbs_up" | "thumbs_down";

export type AIFeedbackSourceType =
  | "automation_log"
  | "insight"
  | "lead_score"
  | "deal_risk"
  | "copilot";

export type AIFeedbackOutcome =
  | "correct"
  | "incorrect"
  | "partially_correct";

export interface AIFeedbackEntry {
  id: string;
  source_type: AIFeedbackSourceType;
  source_id: string;
  user_id: string;
  rating: AIFeedbackRating;
  outcome: AIFeedbackOutcome | null;
  feedback_text: string | null;
  ai_confidence: number | null;
  action_type: string | null;
  created_at: string;
}

export interface AIAccuracyMetrics {
  total: number;
  thumbs_up: number;
  thumbs_down: number;
  approval_rate: number;
  by_action_type: Record<
    string,
    { total: number; thumbs_up: number; thumbs_down: number; approval_rate: number }
  >;
  by_source_type: Record<
    string,
    { total: number; thumbs_up: number; thumbs_down: number; approval_rate: number }
  >;
  trend: Array<{ week: string; total: number; approval_rate: number }>;
}

// ─── Relationship Graph ──────────────────────────────────────────

export type GraphNodeType = "contact" | "company" | "deal";
export type GraphNodeHealth = "good" | "warning" | "at_risk";
export type GraphLinkType = "works_at" | "involved_in" | "belongs_to";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  value: number;
  health: GraphNodeHealth;
  metadata: Record<string, unknown>;
}

export interface GraphLink {
  source: string;
  target: string;
  type: GraphLinkType;
  strength: number;
}

export interface RelationshipGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
