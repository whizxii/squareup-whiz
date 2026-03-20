/**
 * React Query Hooks Factory for CRM
 *
 * Every hook returns { data, isLoading, error, refetch } for queries
 * and { mutate, mutateAsync, isPending } for mutations.
 * Optimistic updates for stage changes, inline edits, etc.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { crmApi, type ContactFilters, type DealFilters, type PaginationParams, type SortParams } from "@/lib/api/crm-api";
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
  Email,
  EmailSendPayload,
  EmailFilters,
  EmailSequence,
  SequenceEnrollment,
  SmartList,
  Workflow,
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
} from "@/lib/types/crm";

// ─── Query key factory ───────────────────────────────────────────

export const crmKeys = {
  all: ["crm"] as const,

  // Contacts
  contacts: () => [...crmKeys.all, "contacts"] as const,
  contactList: (filters?: ContactFilters, pagination?: PaginationParams, sort?: SortParams) =>
    [...crmKeys.contacts(), "list", { filters, pagination, sort }] as const,
  contactDetail: (id: string) => [...crmKeys.contacts(), "detail", id] as const,
  contact360: (id: string) => [...crmKeys.contacts(), "360", id] as const,
  contactDuplicates: (id: string) => [...crmKeys.contacts(), "duplicates", id] as const,

  // Companies
  companies: () => [...crmKeys.all, "companies"] as const,
  companyList: (pagination?: PaginationParams, sort?: SortParams) =>
    [...crmKeys.companies(), "list", { pagination, sort }] as const,
  companyDetail: (id: string) => [...crmKeys.companies(), "detail", id] as const,
  companyContacts: (id: string) => [...crmKeys.companies(), id, "contacts"] as const,
  companyDeals: (id: string) => [...crmKeys.companies(), id, "deals"] as const,

  // Deals
  deals: () => [...crmKeys.all, "deals"] as const,
  dealList: (filters?: DealFilters, pagination?: PaginationParams, sort?: SortParams) =>
    [...crmKeys.deals(), "list", { filters, pagination, sort }] as const,
  dealDetail: (id: string) => [...crmKeys.deals(), "detail", id] as const,
  dealsPipeline: (pipelineId: string) => [...crmKeys.deals(), "pipeline", pipelineId] as const,
  dealsForecast: () => [...crmKeys.deals(), "forecast"] as const,
  staleDeals: () => [...crmKeys.deals(), "stale"] as const,
  contactDeals: (contactId: string) => [...crmKeys.deals(), "contact", contactId] as const,

  // Pipelines
  pipelines: () => [...crmKeys.all, "pipelines"] as const,
  pipelineDetail: (id: string) => [...crmKeys.pipelines(), "detail", id] as const,
  defaultPipeline: () => [...crmKeys.pipelines(), "default"] as const,

  // Tags
  tags: () => [...crmKeys.all, "tags"] as const,

  // Notes
  notes: (contactId: string) => [...crmKeys.all, "notes", contactId] as const,

  // Activities
  activities: (contactId: string) => [...crmKeys.all, "activities", contactId] as const,

  // Calendar
  calendar: () => [...crmKeys.all, "calendar"] as const,
  calendarEvents: (params?: Record<string, string>) =>
    [...crmKeys.calendar(), "events", params] as const,
  upcomingEvents: () => [...crmKeys.calendar(), "upcoming"] as const,
  overdueFollowUps: () => [...crmKeys.calendar(), "overdue"] as const,

  // Recordings
  recordings: (contactId: string) => [...crmKeys.all, "recordings", contactId] as const,
  recordingDetail: (id: string) => [...crmKeys.all, "recording", id] as const,

  // AI
  ai: () => [...crmKeys.all, "ai"] as const,
  nextActions: (contactId: string) => [...crmKeys.ai(), "next-actions", contactId] as const,
  dashboardActions: () => [...crmKeys.ai(), "dashboard-actions"] as const,
  meetingPrep: (eventId: string) => [...crmKeys.ai(), "meeting-prep", eventId] as const,
  atRiskDeals: () => [...crmKeys.ai(), "at-risk-deals"] as const,
  staleContacts: () => [...crmKeys.ai(), "stale-contacts"] as const,
  hotLeads: () => [...crmKeys.ai(), "hot-leads"] as const,

  // Analytics
  analytics: () => [...crmKeys.all, "analytics"] as const,
  analyticsOverview: (period?: string) => [...crmKeys.analytics(), "overview", period] as const,
  pipelineAnalytics: () => [...crmKeys.analytics(), "pipeline"] as const,
  revenueAnalytics: (period?: string) => [...crmKeys.analytics(), "revenue", period] as const,
  activityAnalytics: () => [...crmKeys.analytics(), "activity"] as const,
  winLossAnalytics: (period?: string) => [...crmKeys.analytics(), "win-loss", period] as const,
  stageDuration: () => [...crmKeys.analytics(), "stage-duration"] as const,
  dealVelocity: (period?: string) => [...crmKeys.analytics(), "deal-velocity", period] as const,
  leadSourceAnalytics: (period?: string) => [...crmKeys.analytics(), "lead-sources", period] as const,

  // Notifications
  notifications: () => [...crmKeys.all, "notifications"] as const,
  unreadCount: () => [...crmKeys.notifications(), "unread-count"] as const,

  // Search
  search: (query: string) => [...crmKeys.all, "search", query] as const,

  // Emails
  emails: () => [...crmKeys.all, "emails"] as const,
  emailList: (filters?: EmailFilters, pagination?: PaginationParams) =>
    [...crmKeys.emails(), "list", { filters, pagination }] as const,
  emailDetail: (id: string) => [...crmKeys.emails(), "detail", id] as const,
  emailThread: (threadId: string) => [...crmKeys.emails(), "thread", threadId] as const,
  contactEmails: (contactId: string) => [...crmKeys.emails(), "contact", contactId] as const,

  // Sequences
  sequences: () => [...crmKeys.all, "sequences"] as const,
  sequenceDetail: (id: string) => [...crmKeys.sequences(), "detail", id] as const,
  sequenceStats: (id: string) => [...crmKeys.sequences(), id, "stats"] as const,
  sequenceEnrollments: (id: string) => [...crmKeys.sequences(), id, "enrollments"] as const,
  contactEnrollments: (contactId: string) => [...crmKeys.sequences(), "contact", contactId] as const,

  // Smart Lists
  smartLists: () => [...crmKeys.all, "smart-lists"] as const,
  smartListList: (params?: Record<string, unknown>) =>
    [...crmKeys.smartLists(), "list", params] as const,
  smartListDetail: (id: string) => [...crmKeys.smartLists(), "detail", id] as const,
  smartListMembers: (id: string, pagination?: Record<string, unknown>) =>
    [...crmKeys.smartLists(), id, "members", pagination] as const,

  // Workflows
  workflows: () => [...crmKeys.all, "workflows"] as const,
  workflowList: (params?: Record<string, unknown>) =>
    [...crmKeys.workflows(), "list", params] as const,
  workflowDetail: (id: string) => [...crmKeys.workflows(), "detail", id] as const,
  workflowHistory: (id: string) => [...crmKeys.workflows(), id, "history"] as const,

  // Deduplication
  dedup: () => [...crmKeys.all, "dedup"] as const,
  dedupScan: (limit?: number) => [...crmKeys.dedup(), "scan", limit] as const,
} as const;

// ─── Contact Hooks ───────────────────────────────────────────────

export function useContacts(
  filters?: ContactFilters,
  pagination?: PaginationParams,
  sort?: SortParams
) {
  return useQuery({
    queryKey: crmKeys.contactList(filters, pagination, sort),
    queryFn: () => crmApi.listContacts(filters, pagination, sort),
    staleTime: 30_000,
  });
}

export function useContact(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.contactDetail(id),
    queryFn: () => crmApi.getContact(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 30_000,
  });
}

export function useContact360(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.contact360(id),
    queryFn: () => crmApi.getContact360(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 60_000,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contact>) => crmApi.createContact(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.contacts() });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Contact> }) =>
      crmApi.updateContact(id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: crmKeys.contactDetail(id) });
      const previous = qc.getQueryData<Contact>(crmKeys.contactDetail(id));
      if (previous) {
        qc.setQueryData(crmKeys.contactDetail(id), { ...previous, ...updates });
      }
      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        qc.setQueryData(crmKeys.contactDetail(id), context.previous);
      }
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.contactDetail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.contact360(id) });
      qc.invalidateQueries({ queryKey: crmKeys.contacts() });
    },
  });
}

export function useArchiveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.archiveContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.contacts() });
    },
  });
}

export function useMergeContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) =>
      crmApi.mergeContacts(primaryId, secondaryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.contacts() });
    },
  });
}

// ─── Dedup Hooks ────────────────────────────────────────────────

export function useScanDuplicates(limit: number = 100, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.dedupScan(limit),
    queryFn: () => crmApi.scanDuplicates(limit),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useDismissDuplicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactAId, contactBId }: { contactAId: string; contactBId: string }) =>
      crmApi.dismissDuplicate(contactAId, contactBId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.dedup() });
    },
  });
}

export function useCRMSearch(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.search(query),
    queryFn: () => crmApi.searchCRM(query),
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: 10_000,
  });
}

// ─── Company Hooks ───────────────────────────────────────────────

export function useCompanies(pagination?: PaginationParams, sort?: SortParams) {
  return useQuery({
    queryKey: crmKeys.companyList(pagination, sort),
    queryFn: () => crmApi.listCompanies(pagination, sort),
    staleTime: 30_000,
  });
}

export function useCompany(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.companyDetail(id),
    queryFn: () => crmApi.getCompany(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) => crmApi.createCompany(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.companies() });
    },
  });
}

// ─── Deal Hooks ──────────────────────────────────────────────────

export function useDeals(
  filters?: DealFilters,
  pagination?: PaginationParams,
  sort?: SortParams
) {
  return useQuery({
    queryKey: crmKeys.dealList(filters, pagination, sort),
    queryFn: () => crmApi.listDeals(filters, pagination, sort),
    staleTime: 30_000,
  });
}

export function useDeal(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.dealDetail(id),
    queryFn: () => crmApi.getDeal(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useDealsPipeline(pipelineId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.dealsPipeline(pipelineId),
    queryFn: () => crmApi.getDealsPipeline(pipelineId),
    enabled: options?.enabled ?? !!pipelineId,
    staleTime: 15_000,
  });
}

export function useDealsForContact(contactId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.contactDeals(contactId),
    queryFn: () => crmApi.getDealsForContact(contactId),
    enabled: options?.enabled ?? !!contactId,
    staleTime: 30_000,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Deal>) => crmApi.createDeal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.deals() });
    },
  });
}

export function useMoveDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      crmApi.moveDealStage(id, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.deals() });
      qc.invalidateQueries({ queryKey: crmKeys.analytics() });
    },
  });
}

export function useWinDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.winDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.deals() });
      qc.invalidateQueries({ queryKey: crmKeys.analytics() });
    },
  });
}

export function useLoseDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, detail }: { id: string; reason: string; detail?: string }) =>
      crmApi.loseDeal(id, reason, detail),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.deals() });
      qc.invalidateQueries({ queryKey: crmKeys.analytics() });
    },
  });
}

// ─── Pipeline Hooks ──────────────────────────────────────────────

export function usePipelines() {
  return useQuery({
    queryKey: crmKeys.pipelines(),
    queryFn: () => crmApi.listPipelines(),
    staleTime: 300_000,
  });
}

export function useDefaultPipeline() {
  return useQuery({
    queryKey: crmKeys.defaultPipeline(),
    queryFn: () => crmApi.getDefaultPipeline(),
    staleTime: 300_000,
  });
}

// ─── Tag Hooks ───────────────────────────────────────────────────

export function useTags() {
  return useQuery({
    queryKey: crmKeys.tags(),
    queryFn: () => crmApi.listTags(),
    staleTime: 300_000,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) => crmApi.createTag(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.tags() });
    },
  });
}

// ─── Note Hooks ──────────────────────────────────────────────────

export function useNotes(contactId: string, pagination?: PaginationParams) {
  return useQuery({
    queryKey: crmKeys.notes(contactId),
    queryFn: () => crmApi.listNotes(contactId, pagination),
    enabled: !!contactId,
    staleTime: 30_000,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      data,
    }: {
      contactId: string;
      data: { content: string; deal_id?: string; is_pinned?: boolean };
    }) => crmApi.createNote(contactId, data),
    onSuccess: (_data, { contactId }) => {
      qc.invalidateQueries({ queryKey: crmKeys.notes(contactId) });
      qc.invalidateQueries({ queryKey: crmKeys.contact360(contactId) });
    },
  });
}

// ─── Activity Hooks ──────────────────────────────────────────────

export function useActivities(contactId: string, pagination?: PaginationParams) {
  return useQuery({
    queryKey: crmKeys.activities(contactId),
    queryFn: () => crmApi.listActivities(contactId, pagination),
    enabled: !!contactId,
    staleTime: 30_000,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Activity>) => crmApi.createActivity(data),
    onSuccess: (_data, variables) => {
      if (variables.contact_id) {
        qc.invalidateQueries({ queryKey: crmKeys.activities(variables.contact_id) });
        qc.invalidateQueries({ queryKey: crmKeys.contact360(variables.contact_id) });
      }
    },
  });
}

// ─── Calendar Hooks ──────────────────────────────────────────────

export function useCalendarEvents(params?: {
  start_date?: string;
  end_date?: string;
  contact_id?: string;
  deal_id?: string;
}) {
  return useQuery({
    queryKey: crmKeys.calendarEvents(params),
    queryFn: () => crmApi.listCalendarEvents(params),
    staleTime: 30_000,
  });
}

export function useUpcomingEvents() {
  return useQuery({
    queryKey: crmKeys.upcomingEvents(),
    queryFn: () => crmApi.getUpcomingEvents(),
    staleTime: 60_000,
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CalendarEvent>) => crmApi.createCalendarEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.calendar() });
    },
  });
}

// ─── Email Hooks ────────────────────────────────────────────────

export function useEmails(
  filters?: EmailFilters,
  pagination?: PaginationParams
) {
  return useQuery({
    queryKey: crmKeys.emailList(filters, pagination),
    queryFn: () => crmApi.listEmails(filters, pagination),
    staleTime: 30_000,
  });
}

export function useEmail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.emailDetail(id),
    queryFn: () => crmApi.getEmail(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 30_000,
  });
}

export function useEmailThread(threadId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.emailThread(threadId),
    queryFn: () => crmApi.getEmailThread(threadId),
    enabled: options?.enabled ?? !!threadId,
    staleTime: 30_000,
  });
}

export function useContactEmails(contactId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.contactEmails(contactId),
    queryFn: () => crmApi.getEmailsForContact(contactId),
    enabled: options?.enabled ?? !!contactId,
    staleTime: 30_000,
  });
}

export function useSendEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailSendPayload) => crmApi.sendEmail(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: crmKeys.emails() });
      if (variables.contact_id) {
        qc.invalidateQueries({ queryKey: crmKeys.contactEmails(variables.contact_id) });
        qc.invalidateQueries({ queryKey: crmKeys.contact360(variables.contact_id) });
        qc.invalidateQueries({ queryKey: crmKeys.activities(variables.contact_id) });
      }
    },
  });
}

export function useTrackEmailOpen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emailId: string) => crmApi.trackEmailOpen(emailId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.emails() });
    },
  });
}

export function useTrackEmailClick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emailId: string) => crmApi.trackEmailClick(emailId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.emails() });
    },
  });
}

// ─── Sequence Hooks ─────────────────────────────────────────────

export function useSequences() {
  return useQuery({
    queryKey: crmKeys.sequences(),
    queryFn: () => crmApi.listSequences(),
    staleTime: 30_000,
  });
}

export function useSequence(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.sequenceDetail(id),
    queryFn: () => crmApi.getSequence(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 30_000,
  });
}

export function useSequenceStats(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.sequenceStats(id),
    queryFn: () => crmApi.getSequenceStats(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 60_000,
  });
}

export function useContactEnrollments(contactId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.contactEnrollments(contactId),
    queryFn: () => crmApi.getEnrollmentsForContact(contactId),
    enabled: options?.enabled ?? !!contactId,
    staleTime: 30_000,
  });
}

export function useSequenceEnrollments(sequenceId: string, status?: string) {
  return useQuery({
    queryKey: [...crmKeys.sequenceEnrollments(sequenceId), status ?? "all"],
    queryFn: () => crmApi.getSequenceEnrollments(sequenceId, status),
    enabled: !!sequenceId,
    staleTime: 30_000,
  });
}

export function useCreateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EmailSequence>) => crmApi.createSequence(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.sequences() });
    },
  });
}

export function useUpdateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmailSequence> }) =>
      crmApi.updateSequence(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.sequenceDetail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.sequences() });
    },
  });
}

export function useEnrollInSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, contactId }: { sequenceId: string; contactId: string }) =>
      crmApi.enrollInSequence(sequenceId, contactId),
    onSuccess: (_data, { sequenceId, contactId }) => {
      qc.invalidateQueries({ queryKey: crmKeys.sequenceDetail(sequenceId) });
      qc.invalidateQueries({ queryKey: crmKeys.contactEnrollments(contactId) });
      qc.invalidateQueries({ queryKey: crmKeys.contact360(contactId) });
    },
  });
}

export function usePauseSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.pauseSequence(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: crmKeys.sequenceDetail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.sequences() });
    },
  });
}

export function useActivateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.activateSequence(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: crmKeys.sequenceDetail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.sequences() });
    },
  });
}

export function useUnenrollFromSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => crmApi.unenrollFromSequence(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.sequences() });
    },
  });
}

// ─── Recording Hooks ─────────────────────────────────────────────

export function useRecordings(contactId: string) {
  return useQuery({
    queryKey: crmKeys.recordings(contactId),
    queryFn: () => crmApi.getRecordingsForContact(contactId),
    enabled: !!contactId,
    staleTime: 60_000,
  });
}

export function useRecording(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.recordingDetail(id),
    queryFn: () => crmApi.getRecording(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useUploadRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; metadata: { contact_id: string; deal_id?: string; title?: string } }) =>
      crmApi.uploadRecording(args.file, args.metadata),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: crmKeys.recordings(vars.metadata.contact_id) });
      qc.invalidateQueries({ queryKey: crmKeys.contact360(vars.metadata.contact_id) });
    },
  });
}

export function useTriggerTranscription(contactId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.triggerTranscription(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: crmKeys.recordingDetail(id) });
      // Also invalidate the recordings list so status updates propagate
      if (contactId) {
        qc.invalidateQueries({ queryKey: crmKeys.recordings(contactId) });
        qc.invalidateQueries({ queryKey: crmKeys.contact360(contactId) });
      }
    },
  });
}

// ─── AI Hooks ────────────────────────────────────────────────────

export function useEnrichContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => crmApi.enrichContact(contactId),
    onSuccess: (_data, contactId) => {
      qc.invalidateQueries({ queryKey: crmKeys.contact360(contactId) });
    },
  });
}

export function useScoreContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => crmApi.scoreContact(contactId),
    onSuccess: (_data, contactId) => {
      qc.invalidateQueries({ queryKey: crmKeys.contact360(contactId) });
      qc.invalidateQueries({ queryKey: crmKeys.contacts() });
    },
  });
}

export function useNextActions(contactId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.nextActions(contactId),
    queryFn: () => crmApi.getNextActions(contactId),
    enabled: options?.enabled ?? !!contactId,
    staleTime: 120_000,
  });
}

export function useDashboardActions() {
  return useQuery({
    queryKey: crmKeys.dashboardActions(),
    queryFn: () => crmApi.getDashboardActions(),
    staleTime: 120_000,
  });
}

export function useMeetingPrep(eventId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.meetingPrep(eventId),
    queryFn: () => crmApi.getMeetingPrep(eventId),
    enabled: options?.enabled ?? !!eventId,
    staleTime: 300_000,
  });
}

export function useAtRiskDeals() {
  return useQuery({
    queryKey: crmKeys.atRiskDeals(),
    queryFn: () => crmApi.getAtRiskDeals(),
    staleTime: 120_000,
  });
}

export function useHotLeads() {
  return useQuery({
    queryKey: crmKeys.hotLeads(),
    queryFn: () => crmApi.getHotLeads(),
    staleTime: 120_000,
  });
}

export function useAICopilot() {
  return useMutation({
    mutationFn: (query: string) => crmApi.aiCopilot(query),
  });
}

// ─── Analytics Hooks ─────────────────────────────────────────────

export function useAnalyticsOverview(period?: string) {
  return useQuery({
    queryKey: crmKeys.analyticsOverview(period),
    queryFn: () => crmApi.getAnalyticsOverview(period),
    staleTime: 300_000,
  });
}

export function usePipelineAnalytics() {
  return useQuery({
    queryKey: crmKeys.pipelineAnalytics(),
    queryFn: () => crmApi.getPipelineAnalytics(),
    staleTime: 300_000,
  });
}

export function useRevenueAnalytics(period?: string) {
  return useQuery({
    queryKey: crmKeys.revenueAnalytics(period),
    queryFn: () => crmApi.getRevenueAnalytics(period),
    staleTime: 300_000,
  });
}

export function useActivityAnalytics() {
  return useQuery({
    queryKey: crmKeys.activityAnalytics(),
    queryFn: () => crmApi.getActivityAnalytics(),
    staleTime: 300_000,
  });
}

export function useWinLossAnalytics(period?: string) {
  return useQuery({
    queryKey: crmKeys.winLossAnalytics(period),
    queryFn: () => crmApi.getWinLossAnalytics(period),
    staleTime: 300_000,
  });
}

export function useStageDuration() {
  return useQuery({
    queryKey: crmKeys.stageDuration(),
    queryFn: () => crmApi.getStageDuration(),
    staleTime: 300_000,
  });
}

export function useDealVelocity(period?: string) {
  return useQuery({
    queryKey: crmKeys.dealVelocity(period),
    queryFn: () => crmApi.getDealVelocity(period),
    staleTime: 300_000,
  });
}

export function useLeadSourceAnalytics(period?: string) {
  return useQuery({
    queryKey: crmKeys.leadSourceAnalytics(period),
    queryFn: () => crmApi.getLeadSourceAnalytics(period),
    staleTime: 300_000,
  });
}

// ─── Notification Hooks ──────────────────────────────────────────

export function useNotifications(pagination?: PaginationParams) {
  return useQuery({
    queryKey: crmKeys.notifications(),
    queryFn: () => crmApi.listNotifications(pagination),
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: crmKeys.unreadCount(),
    queryFn: () => crmApi.getUnreadCount(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.notifications() });
      qc.invalidateQueries({ queryKey: crmKeys.unreadCount() });
    },
  });
}

// ─── Bulk Operation Hooks ────────────────────────────────────────

export function useBulkUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactIds, stage }: { contactIds: string[]; stage: string }) =>
      crmApi.bulkUpdateStage(contactIds, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.contacts() });
    },
  });
}

export function useBulkArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactIds: string[]) => crmApi.bulkArchive(contactIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.contacts() });
    },
  });
}

// ─── Workflow Hooks ─────────────────────────────────────────────

export function useWorkflows(params?: {
  is_active?: boolean;
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: crmKeys.workflowList(params),
    queryFn: () => crmApi.listWorkflows(params),
    staleTime: 30_000,
  });
}

export function useWorkflow(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.workflowDetail(id),
    queryFn: () => crmApi.getWorkflow(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useWorkflowHistory(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.workflowHistory(id),
    queryFn: () => crmApi.getWorkflowHistory(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 15_000,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof crmApi.createWorkflow>[0]) =>
      crmApi.createWorkflow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.workflows() });
    },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof crmApi.updateWorkflow>[1] }) =>
      crmApi.updateWorkflow(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.workflows() });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.deleteWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.workflows() });
    },
  });
}

export function useActivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.activateWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.workflows() });
    },
  });
}

export function useDeactivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.deactivateWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.workflows() });
    },
  });
}

export function useTestWorkflow() {
  return useMutation({
    mutationFn: ({ id, context }: { id: string; context: Record<string, unknown> }) =>
      crmApi.testWorkflow(id, context),
  });
}

// ─── Smart List Hooks ───────────────────────────────────────────

export function useSmartLists(params?: {
  is_shared?: boolean;
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: crmKeys.smartListList(params),
    queryFn: () => crmApi.listSmartLists(params),
    staleTime: 30_000,
  });
}

export function useSmartList(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: crmKeys.smartListDetail(id),
    queryFn: () => crmApi.getSmartList(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useSmartListMembers(
  id: string,
  pagination?: PaginationParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: crmKeys.smartListMembers(id, pagination as Record<string, unknown>),
    queryFn: () => crmApi.getSmartListMembers(id, pagination),
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateSmartList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof crmApi.createSmartList>[0]) =>
      crmApi.createSmartList(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.smartLists() });
    },
  });
}

export function useUpdateSmartList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof crmApi.updateSmartList>[1] }) =>
      crmApi.updateSmartList(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.smartLists() });
    },
  });
}

export function useDeleteSmartList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.deleteSmartList(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.smartLists() });
    },
  });
}

export function useRefreshSmartList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.refreshSmartList(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: crmKeys.smartListDetail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.smartListMembers(id) });
    },
  });
}

export function useGenerateLookalike() {
  return useMutation({
    mutationFn: ({ id, limit }: { id: string; limit?: number }) =>
      crmApi.generateLookalike(id, limit),
  });
}
