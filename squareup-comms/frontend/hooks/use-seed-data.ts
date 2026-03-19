"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SEED_KEY = "squareup-comms-seeded";

export function useSeedData() {
  const seeded = useRef(false);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (seeded.current) return;
    if (!token) return; // Wait for auth
    if (typeof window !== "undefined" && localStorage.getItem(SEED_KEY)) return;
    seeded.current = true;

    const seed = async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Check if channels exist
        const channelsRes = await fetch(`${API_URL}/api/channels/`, { headers });
        const channels = await channelsRes.json();

        if (!channels || (Array.isArray(channels) && channels.length === 0)) {
          // Seed channels
          await Promise.all([
            fetch(`${API_URL}/api/channels/`, {
              method: "POST",
              headers,
              body: JSON.stringify({ name: "general", type: "public", description: "General discussion", is_default: true }),
            }),
            fetch(`${API_URL}/api/channels/`, {
              method: "POST",
              headers,
              body: JSON.stringify({ name: "random", type: "public", description: "Off-topic and fun" }),
            }),
            fetch(`${API_URL}/api/channels/`, {
              method: "POST",
              headers,
              body: JSON.stringify({ name: "engineering", type: "public", description: "Engineering discussions" }),
            }),
          ]);
        }

        // Seed agents
        await fetch(`${API_URL}/api/agents/seed`, {
          method: "POST",
          headers,
        });

        // Check if contacts exist
        const contactsRes = await fetch(`${API_URL}/api/crm/contacts`, { headers });
        const contactsData = await contactsRes.json();
        const contacts = Array.isArray(contactsData) ? contactsData : contactsData.items || [];

        if (contacts.length === 0) {
          await Promise.all([
            fetch(`${API_URL}/api/crm/contacts`, {
              method: "POST",
              headers,
              body: JSON.stringify({ name: "John Smith", email: "john@acmecorp.com", company: "Acme Corp", title: "CTO", stage: "qualified", value: 50000, source: "conference", tags: ["enterprise", "hot-lead"] }),
            }),
            fetch(`${API_URL}/api/crm/contacts`, {
              method: "POST",
              headers,
              body: JSON.stringify({ name: "Sarah Chen", email: "sarah@techwave.io", company: "TechWave", title: "VP Engineering", stage: "proposal", value: 120000, source: "referral", tags: ["enterprise"] }),
            }),
            fetch(`${API_URL}/api/crm/contacts`, {
              method: "POST",
              headers,
              body: JSON.stringify({ name: "Alex Rivera", email: "alex@startupinc.com", company: "StartupInc", title: "Founder", stage: "lead", value: 15000, source: "website" }),
            }),
            fetch(`${API_URL}/api/crm/contacts`, {
              method: "POST",
              headers,
              body: JSON.stringify({ name: "Priya Patel", email: "priya@globaltech.com", company: "GlobalTech", title: "Head of Product", stage: "negotiation", value: 200000, source: "conference", tags: ["enterprise", "priority"] }),
            }),
          ]);
        }

        // Send a welcome message to general
        const channelsAfter = await fetch(`${API_URL}/api/channels/`, { headers }).then(r => r.json());
        const general = Array.isArray(channelsAfter) ? channelsAfter.find((c: any) => c.name === "general") : null;
        if (general) {
          await fetch(`${API_URL}/api/messages/`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              channel_id: general.id,
              content: "Welcome to SquareUp Comms! \u{1F389}\n\nMeet **@donna** \u{2014} your executive assistant. She can handle anything:\n\u{1F4C7} \"add John, 555-1234, john@acme.com to CRM\"\n\u{1F4CA} \"how many contacts do we have?\"\n\u{1F4C5} \"schedule a meeting with Sarah tomorrow at 2pm\"\n\u{2705} \"create a task for Mike to review the proposal\"\n\nJust type **@donna** followed by what you need. She handles the rest.",
            }),
          });
        }

        localStorage.setItem(SEED_KEY, "true");
        console.log("[SquareUp] Seed data loaded");
      } catch (e) {
        console.warn("[SquareUp] Seed failed:", e);
      }
    };

    seed();
  }, [token]);
}
