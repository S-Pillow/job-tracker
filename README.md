# Job Tracker

A multi-type registrar workflow tracker built for ICANN compliance teams. It replaces manual spreadsheet tracking with a structured, step-by-step workflow tool that guides staff through every phase of a registrar termination, name change, or assignment — from initial notice all the way through teardown and cleanup.

Live at: **[forgeforward.app/tools/job-tracker](https://forgeforward.app/tools/job-tracker)**

---

## What It Does

### Termination Tracking
The core workflow. When ICANN initiates or approves the termination of an accredited registrar, there are 18 distinct steps that must be completed in a specific order — involving registry operations, DNS transitions, WHOIS data migrations, EPP transfers, and post-termination cleanup. This tool tracks every one of those steps for every active termination case simultaneously.

Each termination row expands to reveal the full step list. Staff can check off steps as they complete them, and the tracker automatically calculates progress, highlights the current active step, and locks downstream steps behind gates (e.g., you cannot proceed past Step 6 until registry confirmation is received). Once every step is marked complete, the case moves automatically to the **Completed** tab.

The 18-step workflow is divided into two phases:
- **Transfer Phase** (Steps 1–10): Outreach, registry coordination, EPP transfer, DNS delegation, WHOIS transition, and gate confirmation
- **Teardown & Cleanup Phase** (Steps 11–18): Post-transfer verification, credential revocation, internal system cleanup, and case closure

Special step flags:
- **Gate steps** — block all downstream steps until resolved (e.g., waiting on registry ops confirmation)
- **Stop warning steps** — surface a red banner warning before proceeding
- **Conditional steps** — only apply in certain termination scenarios

### Name Change Tracking *(steps coming soon)*
Tracks registrar name change cases end-to-end. The row structure and step-completion UI are already built; the step definitions for this workflow will be added as the process is documented.

### Assignment Tracking *(steps coming soon)*
Tracks registrar-of-record assignment cases. Same UI and infrastructure as terminations, waiting on step definitions.

---

## Tab Navigation

| Tab | What It Shows |
|-----|--------------|
| **All** | Every open task across all types |
| **Terminations** | Active (incomplete) termination cases |
| **Name Changes** | Active name change cases |
| **Assignments** | Active assignment cases |
| **Completed** | Tasks where every active step is checked off |

Tasks move to Completed automatically — no manual status change needed.

---

## Key Features

- **Expandable rows** — click any registrar to expand its full step list inline; click again to collapse
- **Gate enforcement** — steps after a gate are locked (visually and functionally) until the gate step is complete
- **Optimistic UI** — checkboxes respond instantly; the database update happens in the background
- **Progress bars** — each row shows a live progress bar and step fraction (e.g., 7/18)
- **Workflow phases** — termination steps are visually divided into Transfer and Teardown sections
- **Add task dialogs** — minimal forms for each task type (Registrar Name, IANA ID, Case Number, plus termination-specific fields)
- **Termination types** — ICANN Termination, Self Termination, Terminated for Cause (ICANN Notice Date field only shown for ICANN Terminations)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Prisma 7 + `@prisma/adapter-libsql` |
| Components | Radix UI (Dialog) |
| Forms | React Hook Form + Zod |
| Process Manager | PM2 |
| Web Server | Nginx (reverse proxy) |

---

## Local Development

**Prerequisites:** Node.js 20+, npm

```bash
# Install dependencies
npm install

# Set up the database and seed with sample data
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database

The app uses a local SQLite file (`dev.db`) managed by Prisma. The schema uses a two-layer model:

- **Templates / TemplateSteps** — the master blueprint for each workflow type
- **Tasks / Steps** — instances created from a template when a new case is opened; step state is tracked independently per task

When a new termination is created, the 18 template steps are copied into the task as individual `Step` records, each with their own status, notes, and metadata.

---

## Deployment

The app runs behind Nginx on `forgeforward.app`, proxied from port 3001 via PM2.

```bash
# Build
npm run build

# Start production server on port 3001
pm2 start npm --name "job-tracker-prod" -- run start -- -p 3001
pm2 save
```

Nginx proxies `https://forgeforward.app/tools/job-tracker/*` → `http://127.0.0.1:3001`.

---

## Roadmap

- [ ] Define and implement Name Change workflow steps
- [ ] Define and implement Assignment workflow steps
- [ ] Search and filter across all open tasks
- [ ] Notes field per step (blocked reason, timestamps)
- [ ] Audit log / history per task
- [ ] User authentication and per-user task assignment
- [ ] Email/Slack notifications for gate-blocked tasks
