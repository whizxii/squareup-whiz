# SquareUp CRM — User Manual

A quick-start guide for the team. Covers every working feature with examples.

---

## Getting Around

Open the CRM from the workspace sidebar. The top bar has **13 views** as icon tabs:

| View | What It Does |
|------|-------------|
| **Dashboard** | KPI cards, pipeline funnel, revenue forecast, deal risk |
| **Pipeline** | Drag-and-drop deal board by stage |
| **Contacts** | Sortable table with bulk actions |
| **Calendar** | Month / Week / Agenda views for CRM events |
| **Analytics** | Win/loss, stage duration, velocity, lead sources |
| **Leads** | AI lead scoring with hot/warm/cold tiers |
| **Companies** | Company directory with linked contacts |
| **Sequences** | Email drip campaign builder |
| **Workflows** | Automated trigger → condition → action chains |
| **Smart Lists** | Dynamic contact lists based on filter criteria |
| **AI Activity** | Log of all AI-executed and pending-review actions |
| **Digest** | AI-generated weekly/daily pipeline summary |
| **Graph** | Visual relationship map of contacts, companies, deals |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette (search contacts, deals, navigate) |
| `Cmd+J` | Open AI Copilot |
| `Cmd+Shift+N` | New contact |
| `Cmd+Shift+D` | New deal |
| `Cmd+Shift+A` | Log activity |
| `?` | Show all shortcuts |

---

## Contacts

### Create a Contact

1. Press `Cmd+Shift+N` or click **+ New Contact** in the header.
2. Fill in: Name (required), Email, Phone, Company, Title, Stage, Source.
3. Click **Create**.

> **Example:** Name: "Priya Patel", Email: "priya@acme.co", Company: "Acme Corp", Stage: "Lead"
>
> The system auto-creates the company "Acme Corp" if it doesn't exist and links them.

### Contact 360 Page

Click any contact row to open their full profile. You'll see:

- **Header** — Editable name, stage dropdown (Lead → Qualified → Proposal → Negotiation → Won → Lost), lead score badge, relationship strength ring.
- **Quick actions** — Email, Call, Log Activity, Create Event, Edit, Merge, Archive.
- **AI Next-Actions Banner** — AI suggests what to do next with reasoning. One-click "Log Call" or "Schedule".

**8 Tabs:**

| Tab | Content |
|-----|---------|
| Overview | Contact info, company link, tags, deals summary, lead score breakdown, AI suggestions |
| Timeline | Combined chronological feed of all activities, notes, events, recordings |
| Deals | Deals linked to this contact with health badges and AI coaching |
| Emails | Email thread history |
| Notes | Create/view notes (Cmd+Enter to save) |
| Calendar | Events linked to this contact |
| Recordings | Upload recordings, trigger AI transcription, view summaries |
| Chat | Chat message history mentioning this contact |

### Edit a Contact

On the Contact 360 page:
- Click the contact **name** to edit it inline.
- Click the **stage badge** to change stage via dropdown.
- Click **Edit Contact** from the three-dot menu for the full edit form.

---

## Deals & Pipeline

### Create a Deal

1. Press `Cmd+Shift+D` or use the Pipeline view.
2. Fill in: Title, Value, Stage, Contact (linked), Expected Close Date.
3. Click **Create**.

> **Example:** Title: "Acme Enterprise License", Value: $45,000, Stage: "Proposal", Contact: Priya Patel

### Pipeline Board

The Pipeline view shows a **Kanban board** with columns per stage. Drag a deal card from one column to another to move it through your pipeline.

- Moving a deal to **Won** triggers a celebration animation with confetti.
- Each deal card shows value, probability, and expected close date.
- Switch between pipelines using the dropdown at the top.

### Deal Coaching

On the Contact 360 → Deals tab, each open deal shows an **AI coaching card** with recommendations.

Quick actions on hover: **Win** (trophy icon) or **Lose** (X icon) to close deals fast.

---

## Calendar

### Views

Toggle between **Month**, **Week**, and **Agenda** at the top-right.

- Click any day cell to see events in the right panel.
- Click **New Event** to create a CRM calendar event.
- Upcoming events sidebar shows the next 10 events.

### Create an Event

1. Click **New Event** (or use `Cmd+Shift+A` → Calendar icon on a contact).
2. Fill in: Title, Date/Time, Location, Description, linked Contact.
3. Click **Create**.

### AI Meeting Prep

On any event in the day detail panel, toggle **AI Meeting Prep** to generate:
- Contact history summary
- Deal status
- Talking points
- Risk factors

---

## AI Copilot

Press `Cmd+J` or click the **bot icon** (bottom-right) to open the AI panel.

### Quick Prompts (shown on empty state)

| Button | What It Does |
|--------|-------------|
| **Hot leads** | "Who are my hottest leads?" |
| **At-risk deals** | "Which deals are at risk or stalled?" |
| **Priorities** | "What should I prioritize today?" |
| **Pipeline summary** | "Give me a summary of my pipeline" |

### What You Can Ask

The copilot has access to 10 CRM tools and can:

- **Search and retrieve**: "Show me all contacts at Acme Corp", "What's the status of the TechStart deal?"
- **Create records**: "Create a contact named Sarah Chen at Tesla, email sarah@tesla.com"
- **Update records**: "Move the Acme deal to Negotiation stage", "Change Priya's stage to Qualified"
- **Analyze**: "What's my win rate this quarter?", "Which deals are stalling?"
- **Suggest actions**: "What should I do about the FinanceFirst deal?"

> **Example conversation:**
>
> You: "Who are my top 5 deals by value?"
> Copilot: Lists your largest deals with stage, value, and risk assessment.
>
> You: "Draft talking points for my meeting with Priya tomorrow"
> Copilot: Generates context-aware talking points based on deal history and recent interactions.

Responses stream in real-time with a typewriter effect. The copilot remembers your full conversation within the session.

---

## Lead Scoring

The Leads view shows all contacts scored by AI across three dimensions:

- **Fit** (0–100) — How well the contact matches your ideal customer profile
- **Engagement** (0–100) — Email opens, meetings, activity frequency
- **Intent** (0–100) — Behavioral signals like deal progression, pricing discussions

### Tiers

| Tier | Score | Color |
|------|-------|-------|
| Hot | 70–100 | Red |
| Warm | 40–69 | Yellow |
| Cold | 0–39 | Blue |

### Re-Score a Contact

Hover over any contact in the Leads view and click the **refresh icon** to trigger a fresh AI score.

### AI Suggested Actions

The right panel shows up to 6 AI-suggested actions with:
- What to do
- Why (reasoning)
- Priority (High/Medium/Low)

---

## Bulk Actions

### Select & Act

1. Go to the **Contacts** table view.
2. Check the boxes on contacts you want to act on (or use the header checkbox to select all on the page).
3. The **Bulk Action Bar** appears with:

| Action | What It Does |
|--------|-------------|
| **Stage** | Set all selected contacts to a stage (Lead, Qualified, Proposal, Negotiation, Won, Lost) |
| **Archive** | Archive all selected contacts (with confirmation) |
| **Merge** | Merge 2 selected contacts into one (only when exactly 2 selected) |
| **Export** | Export contacts matching current filters |

> **Example:** Select 15 contacts → Click **Stage** → Choose "Qualified" → All 15 are updated instantly.

---

## Import & Export

### Import Contacts from CSV

1. Click the **upload icon** in the CRM header.
2. **Step 1** — Drag-and-drop or browse for a `.csv` file (first row must be column headers).
3. **Step 2** — Map each CSV column to a CRM field: name, email, phone, company, title, stage, source, value, currency, notes, tags (or skip).
   - Auto-mapping matches common column names automatically.
   - Preview shows the first 5 rows.
4. **Step 3** — Results: see how many were Created, Updated, or Skipped.

> **Example CSV:**
> ```
> Name,Email,Company,Title,Stage
> John Smith,john@acme.co,Acme Corp,VP Sales,Lead
> Sarah Lee,sarah@beta.io,Beta Inc,CTO,Qualified
> ```

If a contact with the same email already exists, it gets **updated** instead of duplicated.

### Export Contacts

1. Click the **download icon** in the CRM header.
2. Choose format: **CSV** (spreadsheet-ready) or **JSON** (developer-friendly).
3. Click **Export** — file downloads automatically.

Exports respect your current search/filter settings.

---

## Companies

### Create a Company

1. Go to **Companies** view.
2. Click **New Company**.
3. Type the company name and press Enter.

> Companies are also auto-created when you set a company name on a contact.

### Company Detail Page

Click a company row to see:
- Company info (domain, industry, size, revenue)
- All contacts linked to this company
- Deals across all contacts at the company

---

## Smart Lists

Dynamic contact lists that auto-update based on filter criteria.

### Create a Smart List

1. Go to **Smart Lists** view → **New Smart List**.
2. Name it (e.g., "Enterprise Hot Leads").
3. Add criteria:
   - Field: `lead_score`, Operator: `>=`, Value: `70`
   - AND/OR: Field: `company`, Operator: `contains`, Value: `Corp`
4. Toggle **Auto-refresh** to keep the list current.
5. Click **Save**.

### Lookalike Finder

On any smart list, click **Generate** in the Lookalike panel. AI finds up to 20 similar contacts not already in your list.

---

## Workflows

Automated actions triggered by CRM events.

### Create a Workflow

1. Go to **Workflows** → **New Workflow**.
2. Set a **Trigger**: Contact Created, Deal Stage Changed, Activity Logged, Score Changed, Field Updated, or Manual.
3. Add **Conditions** (optional): e.g., `stage equals Qualified`.
4. Add **Actions**: Update Field, Create Activity, Send Notification, Add Tag, Move Stage, Assign Owner, Enroll in Sequence, Create Task, Webhook.
5. Save and **Activate**.

> **Example:** Trigger: "Deal Stage Changed" → Condition: `stage equals Won` → Action: "Create Activity" with params: `{"type": "note", "title": "Deal closed!", "content": "Congratulations on closing this deal."}` → Action: "Send Notification".

### Test a Workflow

Click **Test Workflow**, paste a JSON context, and click **Run Test** to see what would happen without affecting real data.

---

## Email Sequences

Multi-step drip campaigns for contacts.

### Build a Sequence

1. Go to **Sequences** → **New Sequence**.
2. Name it (e.g., "New Lead Nurture").
3. Add steps with:
   - Subject line
   - Email body (supports `{{name}}`, `{{company}}` merge fields)
   - Delay between steps (e.g., 2 days)
4. Save.

### Enroll Contacts

On a sequence, click **Enroll** and select contacts to start them on the drip campaign.

> **Note:** Email sequences currently track enrollment status and step progress. Actual email delivery requires Gmail OAuth integration to be connected.

---

## Analytics

The Analytics view provides 6 dashboards. Use the **period selector** (7d / 30d / 90d / YTD) to adjust the timeframe.

| Dashboard | Key Metrics |
|-----------|------------|
| **Win/Loss** | Won vs lost count, win rate %, total won value, avg cycle days, loss reasons |
| **Stage Duration** | Average days per pipeline stage vs SLA targets |
| **Deal Velocity** | Deals created, closed, win rate, avg value, velocity formula |
| **Stage Conversion** | Conversion % between each pipeline stage |
| **Lead Sources** | Contacts, deals, revenue, and conversion rate per source |
| **Deal Risk** | At-risk deals with risk factors and recommendations |

> **Example:** Switch to "90d" → Win/Loss panel shows you closed 12 deals worth $340K with a 42% win rate. Loss reasons chart reveals "Budget" is the top reason.

---

## Duplicate Detection & Merge

### Find Duplicates

Go to the dedicated dedup view (accessible via API). The system scans for contacts with similar names or matching emails.

### Merge Contacts

1. Select **exactly 2 contacts** in the Contacts table.
2. Click **Merge** in the Bulk Action Bar.
3. Choose which contact is **primary** (keeps its ID).
4. The secondary contact's data fills in any blanks on the primary. The secondary is archived.

You can also merge from the Contact 360 three-dot menu → **Merge**.

---

## Dashboard Modes

The Dashboard has two modes (toggle at top):

### Briefing Mode (Sun icon)

AI-generated morning briefing with:
- Top priorities for today
- At-risk deals needing attention
- Upcoming meetings with prep links
- Pipeline health summary

### Metrics Mode (Chart icon)

Traditional KPI dashboard:
- 8 stat cards (Total Contacts, Pipeline Value, Win Rate, Avg Days to Close, Avg Deal Size, Pipeline Velocity, Deals Created, Deals Closed)
- Pipeline funnel chart
- Activity trend (30-day sparkline)
- Revenue: actual vs forecast
- Deal risk panel

---

## Recordings

### Upload a Recording

1. On a Contact 360 → Recordings tab → **Upload Recording**.
2. Select an audio file and provide a title.
3. Click **Upload**.

### AI Transcription

After uploading, click **Transcribe** to generate:
- Full transcript (with speaker labels)
- AI Summary
- Key Topics (with relevance scores)
- Action Items (with assignees and due dates)
- Objections detected
- Sentiment analysis

---

## Weekly Digest

The **Digest** view shows AI-generated summaries of your pipeline activity:

- New contacts and deals this week
- Deals that moved forward or stalled
- Revenue changes
- AI recommendations for the week ahead

---

## Tips & Best Practices

1. **Start your day** in Dashboard → Briefing mode. Let AI tell you what matters.
2. **Use the Copilot** (`Cmd+J`) instead of navigating — ask "What should I focus on?" or "Show me stalled deals."
3. **Keep stages updated** — drag deals in Pipeline view. This powers lead scoring and analytics.
4. **Log activities** after every call or meeting — the AI uses this for scoring and risk assessment.
5. **Set up workflows** for repetitive tasks (e.g., auto-notify when a deal moves to Won).
6. **Use Smart Lists** to segment contacts (e.g., "Hot leads in tech" or "No activity in 30 days").
7. **Check AI Lead Scoring** weekly — re-score contacts after significant interactions.
8. **Export before big changes** — use CSV export as a backup before bulk operations.
