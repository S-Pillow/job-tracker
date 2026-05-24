# Job Tracker

A multi-type registrar workflow tracker built for ICANN compliance teams. It replaces manual spreadsheet tracking with a structured, step-by-step workflow tool that guides staff through every phase of a registrar termination, name change, or assignment — from initial notice all the way through teardown and cleanup.

Live at: **[forgeforward.app/tools/job-tracker](https://forgeforward.app/tools/job-tracker)**

---

## What It Does

### Termination Tracking
The core workflow. When ICANN initiates or approves the termination of an accredited registrar, there are 18 distinct steps that must be completed in a specific order — involving registry operations, DNS transitions, WHOIS data migrations, EPP transfers, and post-termination cleanup. This tool tracks every one of those steps for every active termination case simultaneously.

Each termination row expands to reveal the full step list. Staff can check off steps as they complete them, and the tracker automatically calculates progress, highlights the current active step, and locks downstream steps behind gates (e.g., you cannot proceed past Step 6 until registry confirmation is received). Once every step is marked complete, the case automatically moves to the **Completed** tab.

The 18-step workflow is divided into two phases:
- **Transfer Phase** (Steps 1–10): Outreach, registry coordination, EPP transfer, DNS delegation, WHOIS transition, and gate confirmation
- **Teardown & Cleanup Phase** (Steps 11–18): Post-transfer verification, credential revocation, internal system cleanup, and case closure

Special step flags:
- **Gate steps** — block all downstream steps until resolved (e.g., waiting on registry ops confirmation)
- **Stop warning steps** — surface a red banner warning before proceeding
- **Conditional steps** — only apply in certain termination scenarios (e.g., Gateway CN/TW scope)

### Name Change Tracking *(steps coming soon)*
Tracks registrar name change cases end-to-end. The row structure and step-completion UI are already built; the step definitions for this workflow will be added as the process is documented.

### Assignment Tracking *(steps coming soon)*
Tracks registrar-of-record assignment cases. Same UI and infrastructure as terminations, waiting on step definitions.

---

## Tab Navigation

| Tab | What It Shows |
|-----|--------------|
| **All** | Every open case across all task types |
| **Terminations** | Active (incomplete) termination cases |
| **Name Changes** | Active name change cases |
| **Assignments** | Active assignment cases |
| **Completed** | Cases where every active step is checked off |

Cases move to Completed automatically — no manual status change needed. Completed cases load on demand (paginated) so the initial page load stays fast.

---

## Key Features

### Case Management
- **Expandable rows** — click any registrar row to expand its full step list inline; click again to collapse
- **Add case dialogs** — minimal forms for each task type with validation (Registrar Name, IANA ID, Case Number, plus type-specific fields)
- **Edit case metadata** — pencil button in the expanded panel lets users correct any case field after creation without resetting checklist progress
- **Delete cases** — trash icon on hover; completed cases are protected from deletion (must be reopened first)
- **Reopen completed cases** — rotate icon on the completed case row sends the case back to active without clearing step history
- **Optional "Your name" field** — add forms include a voluntary attribution field stored on the case record

### Workflow Enforcement
- **Gate enforcement** — steps after a gate step are locked (visually and functionally) until the gate is complete
- **Step auto-save** — checkboxes respond instantly (optimistic UI); the database write happens in the background
- **Task status derivation** — high-level case status (Not Started / In Progress / Waiting for Confirmation / Completed) is derived automatically from step states on every save
- **Completed-case protection** — step toggles on a closed case are blocked server-side; users must reopen the case first

### Visibility and Navigation
- **Live search** — filter all visible cases by registrar name, IANA ID, or case number in real time
- **Progress bars** — each row shows a live progress bar and step fraction (e.g., 7/18)
- **Gaining registrar details** — termination cases with gaining registrar info show it in a labeled strip inside the expanded panel
- **Workflow phase dividers** — termination steps are visually separated into Transfer and Teardown sections

### Data and Operations
- **CSV / JSON export** — `/api/export?format=csv` (or `json`) downloads all task and step data for reporting
- **Audit log** — every step toggle, case creation, edit, deletion, close, and reopen is written to an `AuditLog` table with timestamps and field snapshots; entries survive case deletion
- **Pagination** — Completed tab loads 50 cases at a time with a "Load More" button; active cases are fetched server-side at initial load
- **Daily backups** — `scripts/backup-db.sh` runs via cron at 2 AM UTC, uses SQLite's `.backup` API (safe during live traffic), verifies integrity, and retains the 14 most recent copies; optional offsite sync via `OFFSITE_DEST` env var (rsync or rclone)

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

# Set up the database and seed with the termination template
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database

The app uses a local SQLite file (`production.db`) managed by Prisma. The schema uses a two-layer model:

- **Templates / TemplateSteps** — the master blueprint for each workflow type
- **Tasks / Steps** — instances created from a template when a new case is opened; step state is tracked independently per task

When a new termination is created, the 18 template steps are copied into the task as individual `Step` records, each with their own status, completion timestamp, notes, and metadata.

Additional tables:
- **AuditLog** — append-only event log (no foreign key to Task/Step, so entries survive deletion)

Performance defaults applied on connection:
- WAL journal mode (`PRAGMA journal_mode=WAL`) for improved concurrent write performance
- Indexes on `Task.registrarName`, `Task.status`, and `Task.completedAt`

### Backups

```bash
# Run manually
bash scripts/backup-db.sh

# Cron (runs daily at 2 AM UTC — already configured on the server)
0 2 * * * /bin/bash /root/job-tracker/scripts/backup-db.sh >> /root/job-tracker/logs/backup.log 2>&1
```

To enable offsite sync, set `OFFSITE_DEST` in the cron environment:

```bash
# SSH/rsync target
OFFSITE_DEST="user@backup-server:/backups/job-tracker/"

# Cloud target (requires rclone configured)
OFFSITE_DEST="s3:my-bucket/job-tracker-backups/"
```

---

## Deployment

The app runs behind Nginx on `forgeforward.app`, proxied from port 3001 via PM2.

```bash
# Build
npm run build

# Start / restart via PM2
pm2 restart job-tracker-prod
# or on first deploy:
pm2 start npm --name "job-tracker-prod" -- run start -- -p 3001
pm2 save
```

Nginx proxies `https://forgeforward.app/tools/job-tracker/*` → `http://127.0.0.1:3001`.

---

## Roadmap

- [ ] Define and implement Name Change workflow steps
- [ ] Define and implement Assignment workflow steps
- [ ] Notes field per step (blocked reason, freeform comments)
- [ ] Audit log viewer UI (the log is already being written — this adds a read surface)
- [ ] Email/Slack notifications for gate-blocked or overdue tasks
- [ ] Bulk status updates across multiple cases
