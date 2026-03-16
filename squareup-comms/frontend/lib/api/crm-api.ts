/**
 * CRM API Client
 *
 * Follows the existing ApiClient pattern from lib/api.ts.
 * All CRM data flows through this client — no direct fetch calls in components.
 */

import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import type {
  Contact,
  Company,
  Deal,
  Pipeline,
  Tag,
  ContactNote,
  Activity,
  CalendarEvent,
  CallRecording,
  ContactEnrichment,
  LeadScore,
  RelationshipStrength,
  DealRisk,
  MeetingPrep,
  FollowUpSuggestion,
  SmartList,
  Workflow,
  Email,
  EmailSendPayload,
  EmailFilters,
  EmailSequence,
  SequenceEnrollment,
  Contact360Response,
  AnalyticsOverview,
  PipelineMetrics,
  WinLossAnalytics,
  StageDurationMetric,
  DealVelocity,
  LeadSourceMetric,
  ActivityAnalytics,
  CRMNotification,
  PaginatedResponse,
  ApiResponse,
} from "@/lib/types/crm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Query parameter builder ─────────────────────────────────────

function buildParams(
  params: Record<string, string | number | boolean | string[] | undefined>
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) searchParams.append(key, v);
    } else {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

// ─── Filter / sort types ─────────────────────────────────────────

export interface ContactFilters {
  stage?: string;
  company_id?: string;
  tag?: string;
  source?: string;
  score_min?: number;
  score_max?: number;
  date_from?: string;
  date_to?: string;
  is_archived?: boolean;
  search?: string;
}

export interface DealFilters {
  pipeline_id?: string;
  stage?: string;
  status?: string;
  owner_id?: string;
  value_min?: number;
  value_max?: number;
  expected_close_from?: string;
  expected_close_to?: string;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// ─── CRM API Client ─────────────────────────────────────────────

class CRMApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return { "X-User-Id": getCurrentUserId() };
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.error || error.detail || `API Error: ${res.status}`);
    }

    return res.json();
  }

  // ─── Contacts ────────────────────────────────────────────────

  async listContacts(
    filters?: ContactFilters,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<Contact>> {
    const params = buildParams({
      ...filters,
      ...pagination,
      ...sort,
    });
    return this.request(`/api/crm/v2/contacts${params}`);
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.request(`/api/crm/v2/contacts/${id}`);
  }

  async getContact360(id: string): Promise<ApiResponse<Contact360Response>> {
    return this.request(`/api/crm/v2/contacts/${id}/360`);
  }

  async createContact(
    data: Partial<Contact>
  ): Promise<ApiResponse<Contact>> {
    return this.request("/api/crm/v2/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateContact(
    id: string,
    updates: Partial<Contact>
  ): Promise<ApiResponse<Contact>> {
    return this.request(`/api/crm/v2/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async archiveContact(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/contacts/${id}`, {
      method: "DELETE",
    });
  }

  async restoreContact(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/contacts/${id}/restore`, {
      method: "POST",
    });
  }

  async mergeContacts(
    primaryId: string,
    secondaryId: string
  ): Promise<ApiResponse<Contact>> {
    return this.request("/api/crm/v2/contacts/merge", {
      method: "POST",
      body: JSON.stringify({
        primary_id: primaryId,
        secondary_id: secondaryId,
      }),
    });
  }

  async findDuplicates(
    contactId: string
  ): Promise<ApiResponse<Contact[]>> {
    return this.request(`/api/crm/v2/contacts/${contactId}/duplicates`);
  }

  async searchCRM(
    query: string,
    pagination?: PaginationParams
  ): Promise<ApiResponse<{ contacts: Contact[]; companies: Company[]; deals: Deal[] }>> {
    const params = buildParams({ q: query, ...pagination });
    return this.request(`/api/crm/v2/search${params}`);
  }

  // ─── Companies ───────────────────────────────────────────────

  async listCompanies(
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<Company>> {
    const params = buildParams({ ...pagination, ...sort });
    return this.request(`/api/crm/v2/companies${params}`);
  }

  async getCompany(id: string): Promise<ApiResponse<Company>> {
    return this.request(`/api/crm/v2/companies/${id}`);
  }

  async createCompany(
    data: Partial<Company>
  ): Promise<ApiResponse<Company>> {
    return this.request("/api/crm/v2/companies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCompany(
    id: string,
    updates: Partial<Company>
  ): Promise<ApiResponse<Company>> {
    return this.request(`/api/crm/v2/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteCompany(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/companies/${id}`, {
      method: "DELETE",
    });
  }

  async getCompanyContacts(
    companyId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Contact>> {
    const params = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/companies/${companyId}/contacts${params}`);
  }

  async getCompanyDeals(
    companyId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Deal>> {
    const params = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/companies/${companyId}/deals${params}`);
  }

  // ─── Tags ────────────────────────────────────────────────────

  async listTags(): Promise<ApiResponse<Tag[]>> {
    return this.request("/api/crm/v2/tags");
  }

  async createTag(data: { name: string; color: string }): Promise<ApiResponse<Tag>> {
    return this.request("/api/crm/v2/tags", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async addTagToContact(
    contactId: string,
    tagId: string
  ): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/contacts/${contactId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag_id: tagId }),
    });
  }

  async removeTagFromContact(
    contactId: string,
    tagId: string
  ): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/contacts/${contactId}/tags/${tagId}`, {
      method: "DELETE",
    });
  }

  // ─── Notes ───────────────────────────────────────────────────

  async listNotes(
    contactId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ContactNote>> {
    const params = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/contacts/${contactId}/notes${params}`);
  }

  async createNote(
    contactId: string,
    data: { content: string; deal_id?: string; is_pinned?: boolean; mentions?: string[] }
  ): Promise<ApiResponse<ContactNote>> {
    return this.request("/api/crm/v2/notes", {
      method: "POST",
      body: JSON.stringify({ contact_id: contactId, ...data }),
    });
  }

  async updateNote(
    noteId: string,
    updates: Partial<ContactNote>
  ): Promise<ApiResponse<ContactNote>> {
    return this.request(`/api/crm/v2/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteNote(noteId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/notes/${noteId}`, {
      method: "DELETE",
    });
  }

  async pinNote(noteId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/notes/${noteId}/pin`, {
      method: "PUT",
    });
  }

  async unpinNote(noteId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/notes/${noteId}/unpin`, {
      method: "PUT",
    });
  }

  // ─── Activities ──────────────────────────────────────────────

  async listActivities(
    contactId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Activity>> {
    const params = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/contacts/${contactId}/activities${params}`);
  }

  async createActivity(
    data: Partial<Activity>
  ): Promise<ApiResponse<Activity>> {
    return this.request("/api/crm/v2/activities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Deals ───────────────────────────────────────────────────

  async listDeals(
    filters?: DealFilters,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<Deal>> {
    const params = buildParams({ ...filters, ...pagination, ...sort });
    return this.request(`/api/crm/v2/deals${params}`);
  }

  async getDeal(id: string): Promise<ApiResponse<Deal>> {
    return this.request(`/api/crm/v2/deals/${id}`);
  }

  async createDeal(data: Partial<Deal>): Promise<ApiResponse<Deal>> {
    return this.request("/api/crm/v2/deals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDeal(
    id: string,
    updates: Partial<Deal>
  ): Promise<ApiResponse<Deal>> {
    return this.request(`/api/crm/v2/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async moveDealStage(
    id: string,
    stage: string
  ): Promise<ApiResponse<Deal>> {
    return this.request(`/api/crm/v2/deals/${id}/stage`, {
      method: "PUT",
      body: JSON.stringify({ stage }),
    });
  }

  async winDeal(id: string): Promise<ApiResponse<Deal>> {
    return this.request(`/api/crm/v2/deals/${id}/win`, {
      method: "PUT",
    });
  }

  async loseDeal(
    id: string,
    reason: string,
    detail?: string
  ): Promise<ApiResponse<Deal>> {
    return this.request(`/api/crm/v2/deals/${id}/lose`, {
      method: "PUT",
      body: JSON.stringify({ loss_reason: reason, loss_reason_detail: detail }),
    });
  }

  async getDealsPipeline(
    pipelineId: string
  ): Promise<ApiResponse<Record<string, Deal[]>>> {
    return this.request(`/api/crm/v2/deals/pipeline/${pipelineId}`);
  }

  async getDealsForContact(
    contactId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Deal>> {
    const params = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/contacts/${contactId}/deals${params}`);
  }

  async getDealsForecast(): Promise<ApiResponse<{ weighted_value: number; period: string }[]>> {
    return this.request("/api/crm/v2/deals/forecast");
  }

  async getStaleDeals(): Promise<ApiResponse<Deal[]>> {
    return this.request("/api/crm/v2/deals/stale");
  }

  // ─── Pipelines ───────────────────────────────────────────────

  async listPipelines(): Promise<ApiResponse<Pipeline[]>> {
    return this.request("/api/crm/v2/pipelines");
  }

  async getPipeline(id: string): Promise<ApiResponse<Pipeline>> {
    return this.request(`/api/crm/v2/pipelines/${id}`);
  }

  async getDefaultPipeline(): Promise<ApiResponse<Pipeline>> {
    return this.request("/api/crm/v2/pipelines/default");
  }

  async createPipeline(
    data: Partial<Pipeline>
  ): Promise<ApiResponse<Pipeline>> {
    return this.request("/api/crm/v2/pipelines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePipeline(
    id: string,
    updates: Partial<Pipeline>
  ): Promise<ApiResponse<Pipeline>> {
    return this.request(`/api/crm/v2/pipelines/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // ─── Calendar ────────────────────────────────────────────────

  async listCalendarEvents(
    params?: { start_date?: string; end_date?: string; contact_id?: string; deal_id?: string },
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<CalendarEvent>> {
    const qp = buildParams({ ...params, ...pagination });
    return this.request(`/api/crm/v2/calendar/events${qp}`);
  }

  async getCalendarEvent(id: string): Promise<ApiResponse<CalendarEvent>> {
    return this.request(`/api/crm/v2/calendar/events/${id}`);
  }

  async createCalendarEvent(
    data: Partial<CalendarEvent>
  ): Promise<ApiResponse<CalendarEvent>> {
    return this.request("/api/crm/v2/calendar/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCalendarEvent(
    id: string,
    updates: Partial<CalendarEvent>
  ): Promise<ApiResponse<CalendarEvent>> {
    return this.request(`/api/crm/v2/calendar/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async cancelCalendarEvent(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/calendar/events/${id}`, {
      method: "DELETE",
    });
  }

  async completeCalendarEvent(
    id: string,
    outcome: string,
    notes?: string
  ): Promise<ApiResponse<CalendarEvent>> {
    return this.request(`/api/crm/v2/calendar/events/${id}/complete`, {
      method: "PUT",
      body: JSON.stringify({ outcome, outcome_notes: notes }),
    });
  }

  async getUpcomingEvents(): Promise<ApiResponse<CalendarEvent[]>> {
    return this.request("/api/crm/v2/calendar/upcoming");
  }

  async getOverdueFollowUps(): Promise<ApiResponse<CalendarEvent[]>> {
    return this.request("/api/crm/v2/calendar/overdue");
  }

  // ─── Recordings ──────────────────────────────────────────────

  async uploadRecording(
    file: File,
    metadata: { contact_id: string; deal_id?: string; title?: string }
  ): Promise<ApiResponse<CallRecording>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("contact_id", metadata.contact_id);
    if (metadata.deal_id) formData.append("deal_id", metadata.deal_id);
    if (metadata.title) formData.append("title", metadata.title);

    const res = await fetch(`${this.baseUrl}/api/crm/v2/recordings/upload`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.error || error.detail || `Upload failed: ${res.status}`);
    }

    return res.json();
  }

  async getRecording(id: string): Promise<ApiResponse<CallRecording>> {
    return this.request(`/api/crm/v2/recordings/${id}`);
  }

  async triggerTranscription(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/recordings/${id}/transcribe`, {
      method: "POST",
    });
  }

  async getRecordingsForContact(
    contactId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<CallRecording>> {
    const params = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/contacts/${contactId}/recordings${params}`);
  }

  // ─── AI Endpoints ────────────────────────────────────────────

  async enrichContact(contactId: string): Promise<ApiResponse<ContactEnrichment>> {
    return this.request(`/api/crm/v2/ai/enrich/${contactId}`, {
      method: "POST",
    });
  }

  async scoreContact(contactId: string): Promise<ApiResponse<LeadScore>> {
    return this.request(`/api/crm/v2/ai/score/${contactId}`, {
      method: "POST",
    });
  }

  async scoreBatch(): Promise<ApiResponse<{ scored: number }>> {
    return this.request("/api/crm/v2/ai/score/batch", {
      method: "POST",
    });
  }

  async getRelationshipStrength(
    contactId: string
  ): Promise<ApiResponse<RelationshipStrength>> {
    return this.request(`/api/crm/v2/ai/relationship/${contactId}`, {
      method: "POST",
    });
  }

  async assessDealRisk(dealId: string): Promise<ApiResponse<DealRisk>> {
    return this.request(`/api/crm/v2/ai/deal-risk/${dealId}`, {
      method: "POST",
    });
  }

  async getMeetingPrep(eventId: string): Promise<ApiResponse<MeetingPrep>> {
    return this.request(`/api/crm/v2/ai/meeting-prep/${eventId}`);
  }

  async getNextActions(
    contactId: string
  ): Promise<ApiResponse<FollowUpSuggestion[]>> {
    return this.request(`/api/crm/v2/ai/next-actions/${contactId}`);
  }

  async getDashboardActions(): Promise<ApiResponse<FollowUpSuggestion[]>> {
    return this.request("/api/crm/v2/ai/next-actions/dashboard");
  }

  async aiCopilot(
    query: string
  ): Promise<ApiResponse<{ type: string; message: string; data?: unknown }>> {
    return this.request("/api/crm/v2/ai/copilot", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  async getAtRiskDeals(): Promise<ApiResponse<Deal[]>> {
    return this.request("/api/crm/v2/ai/insights/at-risk-deals");
  }

  async getStaleContacts(): Promise<ApiResponse<Contact[]>> {
    return this.request("/api/crm/v2/ai/insights/stale-contacts");
  }

  async getHotLeads(): Promise<ApiResponse<Contact[]>> {
    return this.request("/api/crm/v2/ai/insights/hot-leads");
  }

  // ─── Analytics ───────────────────────────────────────────────

  async getAnalyticsOverview(
    period?: string
  ): Promise<ApiResponse<AnalyticsOverview>> {
    const params = buildParams({ period });
    return this.request(`/api/crm/v2/analytics/overview${params}`);
  }

  async getPipelineAnalytics(): Promise<ApiResponse<PipelineMetrics>> {
    return this.request("/api/crm/v2/analytics/pipeline");
  }

  async getRevenueAnalytics(
    period?: string
  ): Promise<ApiResponse<{ period: string; actual: number; forecast: number }[]>> {
    const params = buildParams({ period });
    return this.request(`/api/crm/v2/analytics/revenue${params}`);
  }

  async getActivityAnalytics(): Promise<ApiResponse<ActivityAnalytics>> {
    return this.request("/api/crm/v2/analytics/activity");
  }

  async getWinLossAnalytics(
    period?: string
  ): Promise<ApiResponse<WinLossAnalytics>> {
    const params = buildParams({ period });
    return this.request(`/api/crm/v2/analytics/win-loss${params}`);
  }

  async getStageDuration(): Promise<ApiResponse<StageDurationMetric[]>> {
    return this.request("/api/crm/v2/analytics/stage-duration");
  }

  async getDealVelocity(
    period?: string
  ): Promise<ApiResponse<DealVelocity>> {
    const params = buildParams({ period });
    return this.request(`/api/crm/v2/analytics/deal-velocity${params}`);
  }

  async getLeadSourceAnalytics(
    period?: string
  ): Promise<ApiResponse<LeadSourceMetric[]>> {
    const params = buildParams({ period });
    return this.request(`/api/crm/v2/analytics/lead-sources${params}`);
  }

  // ─── Emails ─────────────────────────────────────────────────

  async sendEmail(
    data: EmailSendPayload
  ): Promise<ApiResponse<Email>> {
    return this.request("/api/crm/v2/emails/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listEmails(
    filters?: EmailFilters,
    pagination?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Email>>> {
    const params = buildParams({
      ...filters,
      ...pagination,
    });
    return this.request(`/api/crm/v2/emails${params}`);
  }

  async getEmail(id: string): Promise<ApiResponse<Email>> {
    return this.request(`/api/crm/v2/emails/${id}`);
  }

  async getEmailThread(threadId: string): Promise<ApiResponse<Email[]>> {
    return this.request(`/api/crm/v2/emails/thread/${threadId}`);
  }

  async trackEmailOpen(emailId: string): Promise<ApiResponse<Email>> {
    return this.request(`/api/crm/v2/emails/${emailId}/track/open`, {
      method: "PUT",
    });
  }

  async trackEmailClick(emailId: string): Promise<ApiResponse<Email>> {
    return this.request(`/api/crm/v2/emails/${emailId}/track/click`, {
      method: "PUT",
    });
  }

  async getEmailsForContact(
    contactId: string
  ): Promise<ApiResponse<Email[]>> {
    return this.request(`/api/crm/v2/contacts/${contactId}/emails`);
  }

  // ─── Email Sequences ─────────────────────────────────────────

  async listSequences(): Promise<ApiResponse<EmailSequence[]>> {
    return this.request("/api/crm/v2/sequences");
  }

  async getSequence(id: string): Promise<ApiResponse<EmailSequence>> {
    return this.request(`/api/crm/v2/sequences/${id}`);
  }

  async createSequence(
    data: Partial<EmailSequence>
  ): Promise<ApiResponse<EmailSequence>> {
    return this.request("/api/crm/v2/sequences", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async enrollInSequence(
    sequenceId: string,
    contactId: string
  ): Promise<ApiResponse<SequenceEnrollment>> {
    return this.request(`/api/crm/v2/sequences/${sequenceId}/enroll`, {
      method: "POST",
      body: JSON.stringify({ contact_id: contactId }),
    });
  }

  async updateSequence(
    id: string,
    data: Partial<EmailSequence>
  ): Promise<ApiResponse<EmailSequence>> {
    return this.request(`/api/crm/v2/sequences/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async pauseSequence(id: string): Promise<ApiResponse<EmailSequence>> {
    return this.request(`/api/crm/v2/sequences/${id}/pause`, {
      method: "POST",
    });
  }

  async activateSequence(id: string): Promise<ApiResponse<EmailSequence>> {
    return this.request(`/api/crm/v2/sequences/${id}/activate`, {
      method: "POST",
    });
  }

  async unenrollFromSequence(
    enrollmentId: string
  ): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/sequences/enrollments/${enrollmentId}`, {
      method: "DELETE",
    });
  }

  async getSequenceStats(
    id: string
  ): Promise<ApiResponse<Record<string, number>>> {
    return this.request(`/api/crm/v2/sequences/${id}/stats`);
  }

  async getSequenceEnrollments(
    sequenceId: string,
    status?: string
  ): Promise<ApiResponse<SequenceEnrollment[]>> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const qs = params.toString();
    return this.request(
      `/api/crm/v2/sequences/${sequenceId}/enrollments${qs ? `?${qs}` : ""}`
    );
  }

  async getEnrollmentsForContact(
    contactId: string
  ): Promise<ApiResponse<SequenceEnrollment[]>> {
    return this.request(`/api/crm/v2/contacts/${contactId}/enrollments`);
  }


  // ─── Notifications ───────────────────────────────────────────

  async listNotifications(
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<CRMNotification>> {
    const params = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/notifications${params}`);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/crm/v2/notifications/${id}/read`, {
      method: "PUT",
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    return this.request("/api/crm/v2/notifications/read-all", {
      method: "PUT",
    });
  }

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return this.request("/api/crm/v2/notifications/unread-count");
  }

  // ─── Bulk Operations ─────────────────────────────────────────

  async bulkUpdateStage(
    contactIds: string[],
    stage: string
  ): Promise<ApiResponse<{ updated: number }>> {
    return this.request("/api/crm/v2/bulk/contacts/stage", {
      method: "PUT",
      body: JSON.stringify({ contact_ids: contactIds, stage }),
    });
  }

  async bulkAddTag(
    contactIds: string[],
    tagId: string
  ): Promise<ApiResponse<{ updated: number }>> {
    return this.request("/api/crm/v2/bulk/contacts/tag", {
      method: "PUT",
      body: JSON.stringify({ contact_ids: contactIds, tag_id: tagId, action: "add" }),
    });
  }

  async bulkArchive(
    contactIds: string[]
  ): Promise<ApiResponse<{ archived: number }>> {
    return this.request("/api/crm/v2/bulk/contacts", {
      method: "DELETE",
      body: JSON.stringify({ contact_ids: contactIds }),
    });
  }

  async exportContacts(
    format: "csv" | "json" = "csv"
  ): Promise<Blob> {
    const res = await fetch(
      `${this.baseUrl}/api/crm/v2/export/contacts?format=${format}`,
      { headers: this.getAuthHeaders() }
    );
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.blob();
  }

  // ─── Workflows ──────────────────────────────────────────────

  async listWorkflows(params?: {
    is_active?: boolean;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Workflow>>> {
    const qs = buildParams({ ...params });
    return this.request(`/api/crm/v2/workflows${qs}`);
  }

  async getWorkflow(id: string): Promise<ApiResponse<Workflow>> {
    return this.request(`/api/crm/v2/workflows/${id}`);
  }

  async createWorkflow(data: {
    name: string;
    description?: string;
    trigger: { type: string; conditions: { field: string; operator: string; value: unknown }[] };
    actions: { type: string; params: Record<string, unknown> }[];
    is_active?: boolean;
  }): Promise<ApiResponse<Workflow>> {
    return this.request("/api/crm/v2/workflows", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWorkflow(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      trigger: { type: string; conditions: { field: string; operator: string; value: unknown }[] };
      actions: { type: string; params: Record<string, unknown> }[];
    }>
  ): Promise<ApiResponse<Workflow>> {
    return this.request(`/api/crm/v2/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteWorkflow(id: string): Promise<void> {
    return this.request(`/api/crm/v2/workflows/${id}`, { method: "DELETE" });
  }

  async activateWorkflow(id: string): Promise<ApiResponse<Workflow>> {
    return this.request(`/api/crm/v2/workflows/${id}/activate`, { method: "PUT" });
  }

  async deactivateWorkflow(id: string): Promise<ApiResponse<Workflow>> {
    return this.request(`/api/crm/v2/workflows/${id}/deactivate`, { method: "PUT" });
  }

  async testWorkflow(
    id: string,
    context: Record<string, unknown>
  ): Promise<ApiResponse<{ conditions_met: boolean; conditions_evaluated: number; actions: { type: string; params: Record<string, unknown>; would_execute: boolean }[] }>> {
    return this.request(`/api/crm/v2/workflows/${id}/test`, {
      method: "POST",
      body: JSON.stringify({ context }),
    });
  }

  async getWorkflowHistory(
    id: string,
    pagination?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<{ id: string; workflow_id: string; trigger_event: string; status: string; actions_executed: number; actions_failed: number; executed_at: string }>>> {
    const qs = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/workflows/${id}/history${qs}`);
  }

  // ─── Smart Lists ──────────────────────────────────────────

  async listSmartLists(params?: {
    is_shared?: boolean;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<SmartList>>> {
    const qs = buildParams({ ...params });
    return this.request(`/api/crm/v2/smart-lists${qs}`);
  }

  async getSmartList(id: string): Promise<ApiResponse<SmartList>> {
    return this.request(`/api/crm/v2/smart-lists/${id}`);
  }

  async createSmartList(data: {
    name: string;
    description?: string;
    criteria: { field: string; operator: string; value: unknown; conjunction?: string }[];
    sort_by?: string;
    sort_order?: string;
    columns?: string[];
    is_shared?: boolean;
    auto_refresh?: boolean;
  }): Promise<ApiResponse<SmartList>> {
    return this.request("/api/crm/v2/smart-lists", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSmartList(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      criteria: { field: string; operator: string; value: unknown; conjunction?: string }[];
      sort_by: string;
      sort_order: string;
      columns: string[];
      is_shared: boolean;
      auto_refresh: boolean;
    }>
  ): Promise<ApiResponse<SmartList>> {
    return this.request(`/api/crm/v2/smart-lists/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSmartList(id: string): Promise<void> {
    return this.request(`/api/crm/v2/smart-lists/${id}`, { method: "DELETE" });
  }

  async getSmartListMembers(
    id: string,
    pagination?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Contact>>> {
    const qs = buildParams({ ...pagination });
    return this.request(`/api/crm/v2/smart-lists/${id}/members${qs}`);
  }

  async refreshSmartList(id: string): Promise<ApiResponse<SmartList>> {
    return this.request(`/api/crm/v2/smart-lists/${id}/refresh`, { method: "POST" });
  }

  async generateLookalike(
    id: string,
    limit: number = 20
  ): Promise<ApiResponse<{ items: Contact[]; count: number }>> {
    const qs = buildParams({ limit });
    return this.request(`/api/crm/v2/smart-lists/${id}/lookalike${qs}`, { method: "POST" });
  }

  // ─── Bulk Operations ──────────────────────────────────────

  async importContacts(
    file: File,
    mappings: Record<string, string>
  ): Promise<ApiResponse<{ created: number; updated: number; skipped: number; errors: string[] }>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mappings", JSON.stringify(mappings));

    const res = await fetch(`${this.baseUrl}/api/crm/v2/import/contacts`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.error || error.detail || `Import failed: ${res.status}`);
    }

    return res.json();
  }
  // ─── Deduplication ──────────────────────────────────────────

  async scanDuplicates(
    limit: number = 100
  ): Promise<ApiResponse<{ contact_a_id: string; contact_b_id: string; confidence: number; match_reasons: string[] }[]>> {
    return this.request(`/api/crm/v2/dedup/scan?limit=${limit}`);
  }

  async dismissDuplicate(
    contactAId: string,
    contactBId: string
  ): Promise<ApiResponse<{ dismissed: boolean }>> {
    return this.request("/api/crm/v2/dedup/dismiss", {
      method: "POST",
      body: JSON.stringify({
        contact_a_id: contactAId,
        contact_b_id: contactBId,
      }),
    });
  }
}

export const crmApi = new CRMApiClient();
