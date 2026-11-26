# LC Performance Dashboard

A one-page dashboard for reviewing the exchange performance of **AIESEC in Surabaya**. It shows outgoing exchange (oGX) and incoming exchange (iCX) side by side for a selected date range, with a downloadable CSV report.

Built for the **IID Web Development Technical Task**.

| File or folder | Contents | Technology |
| --- | --- | --- |
| [`src/App.vue`](src/App.vue) | Dashboard layout, demo data, date filters, funnels, charts, and CSV export | Vue 3, TypeScript, CSS |
| [`src/main.ts`](src/main.ts) | Frontend entry point | Vue 3 |
| [`public/`](public/) | Static assets, including the AIESEC logo | JPG |
| [`package.json`](package.json) | Dependencies and development scripts | npm, Vite |

> The dashboard uses simulated exchange figures for **1 October–26 November 2026**. The proposed EXPA connection is documented in [Section 6](#6-expa-integration-plan).

<!-- Add the deployment URL here when the dashboard is live. -->
<!-- **Live demo:** [Open dashboard](YOUR_DEPLOYMENT_URL) -->

## 1. Requirements

| Tool | Purpose |
| --- | --- |
| Node.js | Runs the Vite development server and production build |
| npm | Installs dependencies and runs project scripts |

## 2. Local setup

Run these commands from the project folder that contains `package.json`.

```bash
npm install
npm run dev
```

Open the **Local** URL printed in the terminal. Keep the terminal running while using the dashboard. The demo runs locally without an EXPA token.

## 3. Using the dashboard

### 3.1 Filter and compare

Choose a date preset or set a custom start and end date, then click **Apply**. The summary cards, funnels, comparison table, and chart update together.

| Section | What it shows |
| --- | --- |
| Summary | Total sign-ups, applications, realized exchanges, and overall SU → CO conversion |
| Exchange funnels | Counts from **SU → APL → ACC → APD → RE → CO**, with conversion between adjacent phases |
| Comparison table | Phase counts and percentages of sign-ups for oGX and iCX |
| Performance over time | Application counts for oGX and iCX in daily or weekly groups |

### 3.2 Export the performance report

Click **Export Report** to download a CSV for the applied date range. The file includes the date range, phase labels, counts, and percentages of sign-ups for both exchange directions. Each row identifies the source as **Demo data**.

The default range is **1–26 November 2026**. It shows **706 sign-ups**, **358 applications**, **89 realized exchanges**, and **83 completed exchanges**. The overall SU → CO conversion is **11.8%**.

## 4. Maintenance

| What to update | Where to make the change |
| --- | --- |
| Demo counts and coverage dates | Edit `demoRows`, `demoStart`, and `demoEnd` in `src/App.vue` |
| Default date range and presets | Edit `ranges` in `src/App.vue` |
| Phase labels and display order | Edit `phases` in `src/App.vue` |
| CSV fields and filename | Edit `exportReport()` in `src/App.vue` |
| Logo | Replace `public/aiesec-logo.jpg` |

### 4.1 Metric calculations

| Metric | Calculation |
| --- | --- |
| Funnel step conversion | Next phase count ÷ current phase count |
| Table percentage | Phase count ÷ sign-ups for that exchange direction |
| Overall SU → CO conversion | Total completed across oGX and iCX ÷ total sign-ups across oGX and iCX |

Percentages are rounded to one decimal place. A zero denominator is shown as `—` on the dashboard.

## 5. Build and verification

Create the production build and preview it locally.

```bash
npm run build
npm run preview
```

The deployable files are generated in `dist/`.

| Check | Expected result |
| --- | --- |
| Open the dashboard | November summary shows 706 sign-ups |
| Select **Last month → Apply** | October summary shows 590 sign-ups |
| Switch from **Daily** to **Weekly** | The chart groups applications into seven-day periods |
| Click **Export Report** after applying October | The CSV contains October dates and columns for both oGX and iCX |
| Open on a narrow screen | The funnels stack and wide content scrolls inside its section |

## 6. EXPA integration plan

The current Vue app reads simulated data from `src/App.vue`. To connect live data, a backend would query EXPA for the selected range and return aggregate counts for each exchange direction and phase.

```mermaid
sequenceDiagram
    participant UI as Vue dashboard
    participant API as Backend API
    participant EXPA as EXPA GraphQL
    UI->>API: Request data for selected dates
    API->>EXPA: Query oGX and iCX phase counts
    EXPA-->>API: Return query results
    API-->>UI: Return aggregate performance data
```

### 6.1 Credential handling

Store the EXPA credential in a server-side environment variable such as `EXPA_TOKEN`. The backend reads it when calling EXPA and returns only the aggregate data needed by the dashboard. Keep the credential out of `VITE_` variables, client code, and Git commits.

## 7. Development issues

| Issue | How I handled it |
| --- | --- |
| The EXPA application query returned zero records during testing. | I checked that the endpoint could return committee and opportunity data. Since the application query still returned zero, I used a clearly labeled demo dataset so the dashboard features could be tested. |
| The initial line chart made the oGX and iCX daily counts hard to compare. | I replaced it with grouped bars so the two counts sit side by side for each day or week. |

## 8. Troubleshooting

| Symptom | What to check |
| --- | --- |
| `npm` cannot find `package.json` | Run the command from the project root. |
| The logo does not appear | Check that the file is named `aiesec-logo.jpg` and is inside `public/`. |
| Changing dates does not update the numbers | Click **Apply** to confirm the new date range. |
| The dashboard shows **No demo data for this range** | Select a range that overlaps 1 October–26 November 2026. |
