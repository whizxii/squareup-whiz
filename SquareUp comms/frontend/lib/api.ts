const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private baseUrl: string;
  private userId: string;

  constructor() {
    this.baseUrl = API_URL;
    this.userId = "dev-user-001"; // TODO: Replace with Firebase auth
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": this.userId,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API Error: ${res.status}`);
    }

    return res.json();
  }

  // Channels
  async getChannels() {
    return this.request<Channel[]>("/api/channels/");
  }

  async createChannel(data: {
    name: string;
    type: string;
    description?: string;
    icon?: string;
  }) {
    return this.request<Channel>("/api/channels/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getChannel(id: string) {
    return this.request<Channel>(`/api/channels/${id}`);
  }

  // Messages
  async getMessages(channelId: string, beforeId?: string, limit = 50) {
    const params = new URLSearchParams({
      channel_id: channelId,
      limit: String(limit),
    });
    if (beforeId) params.set("before_id", beforeId);
    return this.request<Message[]>(`/api/messages/?${params}`);
  }

  async sendMessage(data: {
    channel_id: string;
    content: string;
    content_html?: string;
    thread_id?: string;
    mentions?: { type: string; id: string }[];
  }) {
    return this.request<Message>("/api/messages/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async editMessage(id: string, content: string, contentHtml?: string) {
    return this.request<Message>(`/api/messages/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content, content_html: contentHtml }),
    });
  }

  async deleteMessage(id: string) {
    return this.request<void>(`/api/messages/${id}`, {
      method: "DELETE",
    });
  }

  async addReaction(messageId: string, emoji: string) {
    return this.request<void>(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(messageId: string, emoji: string) {
    return this.request<void>(
      `/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      { method: "DELETE" }
    );
  }

  async getThreadReplies(messageId: string) {
    return this.request<Message[]>(`/api/messages/threads/${messageId}`);
  }
}

// Types duplicated here for API layer (mirrors backend)
interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
  icon?: string;
  agent_id?: string;
  is_default?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_type: string;
  content?: string;
  content_html?: string;
  attachments?: string;
  thread_id?: string;
  reply_count: number;
  mentions?: string;
  edited: boolean;
  pinned: boolean;
  created_at: string;
  updated_at?: string;
}

export const api = new ApiClient();
