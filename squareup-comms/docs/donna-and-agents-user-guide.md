# Donna & Agents — User Guide

Your AI-powered team members that live inside SquareUp Comms. Mention them in any chat channel, talk to them directly, or let them work on autopilot.

---

## Quick Start: Talk to Donna

Type `@Donna` in any channel message composer. A dropdown appears — select **Donna** from the Agents section.

**Example messages:**

```
@Donna add Sarah Chen from Acme Corp to CRM, she's VP of Sales, email sarah@acme.com
```

```
@Donna how many open deals do we have this month?
```

```
@Donna create a task to follow up with Beta Corp by Friday, assign it to me
```

```
@Donna draft an email to sarah@acme.com about our pricing proposal
```

Donna streams her response in real-time — you'll see her thinking, calling tools, and delivering results live in the channel.

---

## What Donna Can Do

### CRM Management
| Action | Example |
|--------|---------|
| Search contacts | `@Donna find all contacts at Acme Corp` |
| Create contact | `@Donna add John Lee, CTO at Nova Inc, john@nova.io` |
| Update contact | `@Donna update Sarah Chen's phone to 555-0123` |
| Add notes | `@Donna add a note to Sarah Chen: discussed pricing, she needs board approval` |
| Log activity | `@Donna log a call with John Lee — discussed Q3 roadmap` |
| Search companies | `@Donna what companies do we have in the pipeline?` |

### Deals & Pipeline
| Action | Example |
|--------|---------|
| List deals | `@Donna show me all open deals` |
| Create deal | `@Donna create a deal "Acme Enterprise" worth $50K in Proposal stage` |
| Move deal stage | `@Donna move the Acme deal to Negotiation` |
| Pipeline overview | `@Donna give me a pipeline summary` |
| Deal metrics | `@Donna what are our deal metrics this quarter?` |

### Tasks & Reminders
| Action | Example |
|--------|---------|
| Create task | `@Donna create a task: Send proposal to Acme, due Friday, high priority` |
| List tasks | `@Donna what are my open tasks?` |
| Complete task | `@Donna mark the Acme proposal task as done` |
| Assign task | `@Donna assign the follow-up task to Alex` |
| Set reminder | `@Donna remind me to call Sarah tomorrow at 2pm` |
| List reminders | `@Donna what reminders do I have?` |

### Calendar
| Action | Example |
|--------|---------|
| View schedule | `@Donna what's on my calendar today?` |
| Create event | `@Donna schedule a meeting with Sarah Chen tomorrow at 3pm for 30 minutes` |
| Check availability | `@Donna am I free Thursday afternoon?` |

### Email
| Action | Example |
|--------|---------|
| Draft email | `@Donna draft an email to sarah@acme.com following up on our pricing call` |
| Send email | `@Donna send an email to john@nova.io about the contract update` |
| Search emails | `@Donna find emails about the Acme proposal` |
| Handle email chain | `@Donna analyze this email thread and tell me the action items` |

> **Note:** Send email requires your approval before it goes out (see Confirmation Cards below).

### Knowledge & Search
| Action | Example |
|--------|---------|
| Search workspace | `@Donna search our messages for anything about budget concerns` |
| Search CRM notes | `@Donna find CRM notes mentioning pricing objections` |
| Contact history | `@Donna show me the full history with Sarah Chen` |
| Entity deep-dive | `@Donna tell me everything about Acme Corp` |

### Analytics & Insights
| Action | Example |
|--------|---------|
| Contact stats | `@Donna how many new contacts did we add this week?` |
| Pipeline report | `@Donna generate a pipeline summary` |
| Daily brief | `@Donna give me today's daily brief` |
| Deal coaching | `@Donna any advice on the Acme deal?` |

### Channel Operations
| Action | Example |
|--------|---------|
| List channels | `@Donna what channels do we have?` |
| Channel info | `@Donna who's in #sales?` |
| Send message | `@Donna post in #general: Team standup moved to 10am tomorrow` |

### Date & Time
| Action | Example |
|--------|---------|
| Current time | `@Donna what time is it?` |
| Calculate dates | `@Donna what date is 2 weeks from now?` |
| Parse dates | `@Donna when is next Tuesday?` |

---

## Confirmation Cards

For sensitive actions (sending emails, triggering workflows, invoking other agents), Donna asks for your approval before executing.

**What you'll see:** An amber card appears showing exactly what Donna wants to do, with the tool name and input details.

**Your options:**
- **Approve** — Donna proceeds with the action
- **Edit** — Modify the inputs (e.g., tweak the email body) then approve
- **Reject** — Cancel the action, Donna acknowledges and moves on

Donna waits up to 2 minutes for your response before timing out.

---

## Donna Remembers You

Donna learns from your conversations. She remembers:
- Your preferences (e.g., "prefers short emails", "always uses high priority for tasks")
- Facts about your work (e.g., "manages the Acme account", "based in IST timezone")
- Patterns (e.g., "always creates follow-up tasks after meetings")

Memory is per-user — Donna remembers different things about different team members.

**Manage memory:** On the Agents page, hover over Donna's card and click the brain icon to view, edit, or delete stored memories.

---

## Using Other Agents

Donna isn't the only agent. You can mention any agent using `@AgentName` in chat.

### Pre-built Templates

Deploy these from the Agents page → **Templates** button:

| Template | Best For |
|----------|----------|
| **Sales Assistant** | Deal tracking, prospect research, sales follow-ups |
| **Meeting Scheduler** | Calendar management, scheduling, availability checks |
| **Task Master** | Task creation, prioritization, deadline tracking |
| **Research Agent** | Company research, market analysis, information gathering |
| **Support Agent** | Auto-responds in assigned channels (no @mention needed) |
| **Daily Standup Bot** | Posts automated daily standups (runs Mon-Fri at 9am) |
| **Deal Closer** | Deal strategy, objection handling, closing techniques |
| **Onboarding Buddy** | New hire onboarding, company info, process guidance |

### Create Your Own Agent

Three ways to create a custom agent:

1. **From template** — Pick a template, customize it, deploy
2. **Manual wizard** — Step-by-step: name → select tools → write system prompt → review
3. **AI-generated** — Describe what you want in plain English, the AI builds the config

Go to Agents page → **Create Agent** to get started.

---

## Agents Page Overview

The **Agents** page (`/agents`) is your control center:

- **Grid/List view** — Browse all agents with status indicators
- **Search & filter** — Find agents by name, or filter by status (idle, working, error)
- **Stats bar** — Total runs, total cost, average success rate across all agents
- **Per-agent actions** — Edit config, view memory, view execution history, delete

### Execution History

Click any agent → see its full execution history:
- Each run shows: timestamp, trigger (mention vs REST), duration, token count, cost
- Expand any run to see the exact tool calls made and their results
- Track success/failure rates over time

---

## How Streaming Works

When you mention an agent in chat, you'll see:

1. **Thinking indicator** — Animated dots with the agent's name ("Donna is thinking...")
2. **Live text** — Words appear in real-time as the agent generates its response
3. **Tool cards** — When the agent calls a tool (e.g., searching CRM), a card appears showing what's happening
4. **Progress bar** — For batch operations, see progress (e.g., "Processing 4/12 contacts...")
5. **Final response** — The complete message with any created/updated records

---

## Direct Chat with Agents

Besides mentioning agents in channels, you can chat with them directly:

1. Go to the **Agents** page
2. Click on any agent
3. Use the built-in chat panel to have a private conversation

This is useful for tasks you don't want to do in a public channel.

---

## Tips & Best Practices

1. **Be specific** — "Add Sarah Chen, VP Sales at Acme, sarah@acme.com" works better than "add a contact"
2. **Chain requests** — Donna handles multi-step tasks: "Add Sarah to CRM, create a $50K deal, and schedule a meeting with her for Friday"
3. **Use natural language** — Say "next Tuesday" or "end of the month" instead of exact dates
4. **Review confirmations** — Always check the details before approving email sends
5. **Check execution history** — If something seems off, review the agent's execution log
6. **Manage memories** — Periodically review what agents remember about you via the brain icon
7. **Assign Support Agent to channels** — Deploy a Support Agent and assign it to a channel for automatic responses (no @mention needed)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Agent not responding | Check the agent's status on the Agents page — it may be in "error" state |
| Wrong information | Review and delete incorrect memories via the brain icon |
| Agent taking too long | Agents time out after 2 minutes per tool confirmation, 120 seconds per LLM call |
| Tools not working | Check that the agent has the right tools assigned (edit agent → capabilities) |
| Mention dropdown not showing | Type `@` and wait — agents appear in the "Agents" section below "People" |
