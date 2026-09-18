# Mobile Payroll App — Architecture Plan

## Overview

A greenfield, offline-first React Native (Expo) app for a single business-owner admin to manage employees, run payroll cycles, and view payslips on iOS and Android. All data lives in a local SQLite database. An on-demand S3 sync layer provides backup and restore via JSON export/import. No tax calculations; the owner manually adds deductions and inclusions per payroll run. Payslips are viewed in-app only.

**Stack:** Expo + React Native + TypeScript, `expo-sqlite`, `aws-sdk` (S3), React Navigation, Zustand (local state).

**Out of scope:** multi-user auth, tax calculations, payslip PDF export, push notifications.

---

## Pay Model

Employees are paid a **fixed monthly rate**. The pay schedule controls how many payments are made per month and on which days. The monthly total always equals the monthly rate exactly.

| Schedule | Payments per month | Payment days | Amount per payment |
|---|---|---|---|
| **Monthly** | 1 | Configurable: 1st, 15th, or last day of month | Full monthly rate |
| **Bi-weekly** | 2 | Configurable: 1st+15th or 15th+last day | Monthly rate ÷ 2 |
| **Weekly** | 4 or 5 | Every Friday | Monthly rate ÷ **work-weeks in that month** |

### Work-week majority rule (weekly schedule)
A work week runs **Monday–Friday (5 working days)**. A week belongs to the month that contains the majority of its working days (at least 3 of 5). Since 5 is odd, there is never a tie.

**Example — September 2026 (ends Wednesday 30th):**
- Week of Sep 28: Mon Sep 28, Tue Sep 29, Wed Sep 30, Thu Oct 1, Fri Oct 2 → 3 days in Sep, 2 in Oct → **September**
- September has 5 work-weeks → weekly payment = monthly rate ÷ 5

**Resignation mid-period:** the final payroll run is opened manually. The admin adjusts the amount via a deduction line item for unused days. No automatic proration.

---

## Data Model

```
employees
  id, name, monthly_rate, pay_schedule (weekly|biweekly|monthly),
  pay_day_config (1st|15th|last — for monthly; 1st_and_15th|15th_and_last — for biweekly),
  is_active, created_at

payroll_runs
  id, employee_id, period_start, period_end, base_amount,
  gross_pay, net_pay, status (draft|committed), created_at
  -- base_amount = the computed schedule amount before manual line items
  -- gross_pay   = base_amount + sum(inclusions)
  -- net_pay     = gross_pay − sum(deductions)

line_items
  id, payroll_run_id, type (inclusion|deduction), label, amount

payslips
  id, payroll_run_id, employee_id, generated_at
  (view-only projection of a committed payroll_run + its line_items)
```

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold

**Status:** `[x] complete`

**Intent**
Bootstrap the Expo + React Native + TypeScript project with the correct folder structure, linting, and dependency set so every subsequent sub-task builds on a consistent foundation.

**Expected Outcomes**
- `npx expo start` runs without errors on iOS and Android simulators.
- TypeScript strict mode enabled with no type errors.
- ESLint + Prettier configured and passing.
- Folder structure created: `src/db`, `src/domain`, `src/screens`, `src/components`, `src/navigation`, `src/sync`, `src/store`.

**Todo List**
1. Initialise project: `npx create-expo-app payroll --template expo-template-blank-typescript`
2. Install core dependencies: `expo-sqlite`, `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/stack`, `zustand`, `aws-sdk`
3. Install dev dependencies: `eslint`, `prettier`, `@typescript-eslint/*`
4. Create folder structure under `src/`
5. Add `tsconfig.json` with `strict: true`
6. Add `.eslintrc.js` and `.prettierrc`
7. Verify `npx expo start` succeeds

**Relevant Context**
- No existing codebase — pure greenfield.
- Use Expo managed workflow to avoid native build complexity.

---

### Sub-Task 2 — Local Database Layer

**Status:** `[x] complete`

**Intent**
Define and initialise the SQLite schema so all domain data is persisted locally on-device. This is the single source of truth for the entire app.

**Expected Outcomes**
- `src/db/schema.ts` contains all `CREATE TABLE` statements.
- `src/db/index.ts` exports an initialised `db` singleton that runs migrations on first open.
- All four tables (`employees`, `payroll_runs`, `line_items`, `payslips`) exist after app launch.
- A `src/db/queries/` directory contains typed query helpers for each table (insert, select, update, delete).

**Todo List**
1. Create `src/db/schema.ts` — define all four `CREATE TABLE IF NOT EXISTS` statements with correct types and foreign keys.
2. Create `src/db/index.ts` — open the SQLite database, run schema on init, export `db` singleton.
3. Create `src/db/queries/employees.ts` — typed CRUD helpers.
4. Create `src/db/queries/payrollRuns.ts` — typed CRUD helpers including query by employee + date range.
5. Create `src/db/queries/lineItems.ts` — typed CRUD helpers, query by `payroll_run_id`.
6. Create `src/db/queries/payslips.ts` — insert and query helpers.
7. Write a basic smoke test (or manual test checklist) verifying tables are created on cold start.

**Relevant Context**
- Use `expo-sqlite` v2 async API (`SQLiteDatabase.execAsync` / `runAsync` / `getAllAsync`).
- `payslips` is a thin record pointing to a committed `payroll_run` — it does not duplicate financial data.

---

### Sub-Task 3 — Domain Logic / Payroll Calculation Engine

**Status:** `[x] complete`

**Intent**
Implement the pure business logic for computing a payroll run so it can be tested independently of the UI and database.

**Expected Outcomes**
- `src/domain/calculatePayroll.ts` exports a pure function: given `base_amount` + line items → returns `gross_pay`, `net_pay`, and itemised breakdown.
- Calculation: `gross_pay = base_amount + sum(inclusions)`, `net_pay = gross_pay − sum(deductions)`.
- `src/domain/payPeriod.ts` exports helpers:
  - `getPayPeriods(schedule, payDayConfig, month, year)` → returns all pay period date ranges for that month.
  - `countWorkWeeksInMonth(month, year)` → counts Mon–Fri work weeks belonging to a month using the majority rule (≥3 of 5 weekdays fall in the month).
  - `getBaseAmount(monthlyRate, schedule, month, year)` → returns the per-payment base amount.
- Unit tests in `src/domain/__tests__/` cover:
  - `countWorkWeeksInMonth`: standard 4-week month, 5-week month, month ending mid-week (e.g. Sep 2026), month starting mid-week.
  - `getBaseAmount`: monthly (always full rate), bi-weekly (always ÷2), weekly 4-week month, weekly 5-week month.
  - `calculatePayroll`: normal case, inclusion-only, deduction-only, deduction exceeding gross.

**Todo List**
1. Create `src/domain/types.ts` — shared TypeScript types: `Employee`, `PayrollRun`, `LineItem`, `PaySchedule`, `PayDayConfig`, `PayslipView`.
2. Create `src/domain/payPeriod.ts` — implement `countWorkWeeksInMonth`, `getPayPeriods`, `getBaseAmount`.
3. Create `src/domain/calculatePayroll.ts` — pure calculation function using `base_amount` + line items.
4. Create `src/domain/__tests__/payPeriod.test.ts` — unit tests covering majority-rule edge cases.
5. Create `src/domain/__tests__/calculatePayroll.test.ts` — unit tests.
6. Run tests and confirm all pass.

**Relevant Context**
- No tax logic — explicitly out of scope.
- Keep this layer free of any React Native or SQLite imports so it stays purely testable JS/TS.
- Work-week majority rule: a Mon–Fri week belongs to the month containing ≥3 of its 5 working days.
- Weekly base amount = `monthly_rate ÷ countWorkWeeksInMonth(month, year)`.
- Bi-weekly base amount = `monthly_rate ÷ 2` always.
- Monthly base amount = `monthly_rate` always.

---

### Sub-Task 4 — Employee Management Screens

**Status:** `[x] complete`

**Intent**
Give the admin the ability to create, edit, and archive employees including their monthly rate, pay schedule, and pay day configuration.

**Expected Outcomes**
- `EmployeeListScreen` shows all active employees with name, monthly rate, and pay schedule.
- `EmployeeFormScreen` handles both create and edit with the following fields:
  - Name (required)
  - Monthly rate (numeric, required, > 0)
  - Pay schedule picker: Monthly (default) / Bi-weekly / Weekly
  - Pay day config picker (context-sensitive):
    - Monthly → 1st | 15th | Last day of month
    - Bi-weekly → 1st & 15th | 15th & last day
    - Weekly → no config needed (always Friday)
- Archiving an employee sets `is_active = false` and hides them from the active list (they remain in historical payroll data).
- Changes persist to SQLite immediately.

**Todo List**
1. Create `src/screens/employees/EmployeeListScreen.tsx` — list active employees, tap to edit, FAB to add new.
2. Create `src/screens/employees/EmployeeFormScreen.tsx` — form with name, monthly rate, pay schedule picker, pay day config picker (shown/hidden based on schedule).
3. Create `src/store/employeeStore.ts` (Zustand) — load employees from DB on mount, expose add/update/archive actions.
4. Wire form validation: name required, monthly rate > 0, pay day config required when schedule is monthly or bi-weekly.
5. Connect store actions to DB query helpers from Sub-Task 2.
6. Manually verify create, edit, and archive flows on both platforms.

**Relevant Context**
- Uses `src/db/queries/employees.ts` from Sub-Task 2.
- Uses `Employee` type from `src/domain/types.ts` (Sub-Task 3).
- Pay day config picker must be context-sensitive: changing the schedule picker should update the available pay day options.

---

### Sub-Task 5 — Payroll Run Screens

**Status:** `[x] complete`

**Intent**
Allow the admin to open a new payroll run for an employee, review the auto-computed base amount, add manual line items (inclusions and deductions), preview net pay, and commit the run.

**Expected Outcomes**
- `PayrollRunListScreen` shows past runs per employee (committed) and any open draft.
- `PayrollRunFormScreen` shows:
  - Period dates (auto-derived from employee's schedule + pay day config)
  - Base amount (auto-computed: `getBaseAmount(monthly_rate, schedule, month, year)`) — read-only, not editable
  - Manual line items (inclusions and deductions)
  - Live net-pay preview
- No hours input — pay is schedule-based, not hourly.
- Committing a run saves the `payroll_run` with `status = committed`, persists all `line_items`, and creates a `payslip` record.
- A draft can be edited; a committed run is read-only.

**Todo List**
1. Create `src/screens/payroll/PayrollRunListScreen.tsx` — list runs for a selected employee, grouped by period.
2. Create `src/screens/payroll/PayrollRunFormScreen.tsx` — show period dates + auto-computed base amount, line item editor, live net-pay preview using `calculatePayroll` from Sub-Task 3.
3. Create `src/screens/payroll/LineItemEditor.tsx` — reusable component for adding/removing inclusions and deductions.
4. Create `src/store/payrollStore.ts` (Zustand) — draft state, commit action, load history.
5. On commit: call `payrollRuns` insert, `lineItems` bulk insert, `payslips` insert from DB helpers.
6. Guard committed runs as read-only in the UI.
7. Manually verify a full run cycle for each schedule type: monthly, bi-weekly, weekly (4-week month), weekly (5-week month).

**Relevant Context**
- Uses `calculatePayroll` and `getBaseAmount` from Sub-Task 3.
- Uses `src/db/queries/payrollRuns.ts` and `src/db/queries/lineItems.ts` from Sub-Task 2.
- `period_start` / `period_end` derived from `getPayPeriods` helper (Sub-Task 3) using employee's schedule + pay day config.
- Base amount is display-only on the form — the admin cannot override it directly (they use line items instead).

---

### Sub-Task 6 — Payslip Viewer

**Status:** `[x] complete`

**Intent**
Provide a clean, readable in-app view of committed payslips grouped by month (most recent first), scoped to the current year, with a stats header that recalculates when an employee filter is applied.

**Expected Outcomes**
- `PayslipListScreen` shows all committed payslips for the current year, grouped by month in reverse-chronological order (July → January).
- Header shows three stats: **Year to Date**, **current month name** total, and a **Q1 | Q2 | Q3 | Q4** breakdown row — all calculated from the currently visible set.
- Employee filter pills (All + one per active employee) are shown below the header. Selecting a pill filters the list AND recalculates all header stats for that employee. The header label updates from "2025 Pay Records" to "{Employee Name} · 2025".
- Months with no payslips render as a faint collapsed placeholder row — present but visually recede.
- `PayslipDetailScreen` shows: employee name, pay period, hours worked, hourly rate, gross pay, each line item (label + amount, colour-coded by type), net pay.
- Data is read-only — no editing from this screen.

**Todo List**
1. Create `src/screens/payslips/PayslipListScreen.tsx` — grouped-by-month list, all 12 months of current year shown, empty months as placeholders.
2. Implement employee filter pill logic — active pill filters `payslips` query and triggers stat recalculation.
3. Implement header stat calculation: YTD total, current-month total, per-quarter totals — derived from filtered payslip set.
4. Update header label to show employee name when a filter is active, revert to "2025 Pay Records" for All.
5. Create `src/screens/payslips/PayslipDetailScreen.tsx` — full breakdown view joining `payroll_runs` + `line_items`.
6. Create `src/components/PayslipCard.tsx` — reusable receipt-style row with avatar initials, name, period, hours, net pay.
7. Create `src/components/LineItemRow.tsx` — row with label, amount, and inclusion/deduction colouring.
8. Connect to `src/db/queries/payslips.ts` and `src/db/queries/lineItems.ts`.
9. Manually verify filter + stat recalculation works correctly for each employee and for All.

**Relevant Context**
- Payslip data comes from joining `payslips` → `payroll_runs` → `line_items` using DB helpers (Sub-Task 2).
- No export/PDF — in-app view only.
- Filter pill behaviour approved in UI/UX prototype review: selecting an employee recalculates all stats (Option B).
- Quarter mapping: Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec.

---

### Sub-Task 7 — S3 Sync Layer

**Status:** `[x] complete`

**Intent**
Allow the admin to back up the full local database to S3 as a JSON snapshot and restore from it on a new device, providing a safety net without requiring a server.

**Expected Outcomes**
- `src/sync/s3Sync.ts` exports `exportToS3(config)` and `importFromS3(config)` functions.
- Export serialises all tables to a single JSON file and uploads to a configured S3 bucket/key.
- Import downloads the JSON, wipes local tables, and re-inserts all records.
- `SyncScreen` in the app lets the admin enter S3 credentials (bucket, region, key, secret), trigger export, and trigger import.
- Credentials stored securely in device keychain via `expo-secure-store`.
- Conflict strategy: last-write-wins (the export timestamp is embedded in the JSON).

**Todo List**
1. Create `src/sync/s3Sync.ts` — `exportToS3` (serialize all DB tables → JSON → upload) and `importFromS3` (download → wipe → re-insert).
2. Create `src/sync/serialise.ts` — helpers to dump all tables to a plain JS object and restore from one.
3. Create `src/screens/sync/SyncScreen.tsx` — credential form, Export button, Import button, last-sync timestamp display.
4. Install and configure `expo-secure-store` for persisting S3 credentials.
5. Add confirmation dialog before import (destructive — overwrites local data).
6. Manually test round-trip: export from device A, import on device B, verify data integrity.

**Relevant Context**
- Use `aws-sdk` S3 client (v2) or `@aws-sdk/client-s3` (v3) — confirm bundle size impact with Expo before choosing.
- The JSON snapshot format should be versioned (`{ version: 1, exportedAt: ISO-string, tables: { ... } }`) to allow future migrations.
- `expo-secure-store` only stores string values — stringify the credentials object.

---

### Sub-Task 8 — Navigation, App Shell & Theme

**Status:** `[x] complete`

**Intent**
Wire all screens together with a coherent navigation structure, finalise the app entry point, and implement a user-toggleable light/dark theme that persists across sessions.

**Expected Outcomes**
- Bottom tab navigator with three tabs: Employees, Payslips, Sync.
- Stack navigators within Employees (list → form → run history → run form) and Payslips (list → detail).
- `App.tsx` initialises the DB (Sub-Task 2) before rendering the navigator.
- Splash screen waits for DB init to complete before showing the app.
- **Light/dark theme toggle** accessible from the Sync screen (settings area).
  - Two complete theme token sets: `darkTheme` and `lightTheme` (colours matching the approved prototypes).
  - Active theme stored in `expo-secure-store` under key `app_theme` and restored on launch.
  - `ThemeContext` (React context) provides the active theme object and a `toggleTheme()` function to the entire component tree.
  - All screens and components consume colours exclusively from `ThemeContext` — no hardcoded colour values anywhere.
  - Toggle renders as a labelled switch ("Dark / Light") on the Sync screen.
  - Theme change takes effect immediately without app restart.

**Todo List**
1. Create `src/navigation/RootNavigator.tsx` — bottom tab navigator with three tabs.
2. Create `src/navigation/EmployeesStack.tsx` — stack: EmployeeList → EmployeeForm → PayrollRunList → PayrollRunForm.
3. Create `src/navigation/PayslipsStack.tsx` — stack: PayslipList → PayslipDetail.
4. Update `App.tsx` — run DB init on mount, show loading indicator until ready, then render `RootNavigator` wrapped in `ThemeProvider`.
5. Create `src/theme/tokens.ts` — define `darkTheme` and `lightTheme` token objects (background, surface, border, text, textMuted, accent, inclusion, deduction, badge colours).
6. Create `src/theme/ThemeContext.tsx` — React context exposing `theme`, `isDark`, and `toggleTheme()`; reads/writes `expo-secure-store` for persistence.
7. Wrap `App.tsx` root with `ThemeProvider` from `ThemeContext`.
8. Refactor all screens and shared components to consume theme tokens from `useTheme()` hook instead of hardcoded values.
9. Add theme toggle switch to `SyncScreen.tsx`.
10. Add tab icons using `@expo/vector-icons`.
11. Manually verify theme toggle on iOS and Android simulators; confirm preference persists after app restart.

**Relevant Context**
- DB initialisation from Sub-Task 2 (`src/db/index.ts`) must complete before any screen mounts.
- Employees, Payroll, and Payslips screens reference each other via navigation params (e.g. `employeeId`).
- Dark theme tokens map to `prototype.html`; light theme tokens map to `prototype-light.html`.
- `expo-secure-store` is already a dependency from Sub-Task 7 — no new package needed.
- Do not use React Native's built-in `Appearance` API for the toggle — the user's explicit in-app preference must always override the system setting.

---

### Sub-Task 9 — UI/UX Prototype

**Status:** `[x] complete`

**Intent**
Produce self-contained interactive HTML prototypes that the owner can open in a browser to review and approve all screen designs — in both dark and light themes — before any React Native code is written.

**Expected Outcomes**
- Two prototype files at the repo root, no external dependencies:
  - `prototype.html` — dark navy/charcoal theme with sky-blue accent.
  - `prototype-light.html` — light grey/white theme with deeper blue accent.
- Both cover all major screens: Employee List, Employee Form, Run History, Payroll Run Form (with line items), Payslip List, Payslip Detail, Sync Screen.
- Clickable navigation between screens that mimics the bottom-tab + stack navigator structure.
- Realistic dummy data pre-populated (Jan–Oct 2026, 4 employees) so the owner can evaluate layout and information hierarchy.
- Mobile viewport (375 × 812 — iPhone 14 size) rendered centred on a desktop browser.

**Todo List**
1. ✅ Design and build `prototype.html` (dark theme) — all screens, full dummy data.
2. ✅ Build `prototype-light.html` — identical structure, light palette.
3. Owner reviews both and approves preferred theme (or requests mix).

**Relevant Context**
- This is design approval only — no React Native code.
- Dark theme tokens are the source of truth for `src/theme/tokens.ts` `darkTheme` (Sub-Task 8).
- Light theme tokens are the source of truth for `src/theme/tokens.ts` `lightTheme` (Sub-Task 8).
- Owner approval of both prototypes gates Sub-Tasks 4–8.
