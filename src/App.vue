<script setup lang="ts">
import { computed, ref } from 'vue'

const phases = [
  { key: 'SU', label: 'Sign Up' },
  { key: 'APL', label: 'Applied' },
  { key: 'ACC', label: 'Accepted' },
  { key: 'APD', label: 'Approved' },
  { key: 'RE', label: 'Realized' },
  { key: 'CO', label: 'Completed' },
] as const

const directions = ['oGX', 'iCX'] as const
const intervals = ['Daily', 'Weekly'] as const

type Phase = (typeof phases)[number]['key']
type Direction = (typeof directions)[number]
type Counts = Record<Phase, number>

const demoStart = '2026-10-01'
const demoEnd = '2026-11-26'
const ranges = {
  'This month': { start: '2026-11-01', end: demoEnd },
  'Last month': { start: demoStart, end: '2026-10-31' },
  'Last 3 months': { start: '2026-09-01', end: demoEnd },
  'This year': { start: '2026-01-01', end: demoEnd },
}
type Preset = keyof typeof ranges | 'Custom'

const presets: Preset[] = ['This month', 'Last month', 'Last 3 months', 'This year', 'Custom']
const logoUrl = `${import.meta.env.BASE_URL}aiesec-logo.jpg`
const exchange = {
  oGX: {
    description: 'Outgoing Global Exchange (Volunteering & Internship)',
    color: '#fa5139',
    bars: ['#fa5139', '#fa765e', '#fa8775', '#fa9788', '#f8a499', '#f4b2a8'],
  },
  iCX: {
    description: 'Incoming Global Exchange (Projects & Partners in SBY)',
    color: '#0080ed',
    bars: ['#0080ed', '#3094ee', '#439ded', '#5ca9ef', '#79b8ef', '#94c6ef'],
  },
}

const kpis = [
  { key: 'SU', label: 'Total Sign Ups' },
  { key: 'APL', label: 'Total Applied' },
  { key: 'RE', label: 'Total Realized' },
] as const

function emptyCounts(): Counts {
  return { SU: 0, APL: 0, ACC: 0, APD: 0, RE: 0, CO: 0 }
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function makeDailyRows(start: string, days: number, direction: Direction, totals: Counts) {
  const weights = Array.from({ length: days }, (_, index) => {
    const progress = index / Math.max(1, days - 1)
    const dip = Math.exp(-Math.pow((progress - 0.42) / 0.16, 2))
    return 0.65 + progress * 0.85 - dip * (direction === 'oGX' ? 0.34 : 0.2)
  })
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let usedWeight = 0

  return weights.map((weight, index) => {
    const before = usedWeight / totalWeight
    usedWeight += weight
    const after = index === days - 1 ? 1 : usedWeight / totalWeight
    const counts = emptyCounts()

    for (const { key } of phases) {
      counts[key] = Math.floor(totals[key] * after) - Math.floor(totals[key] * before)
    }

    return { date: addDays(start, index), direction, counts }
  })
}

const demoRows = [
  ...makeDailyRows(demoStart, 31, 'oGX', { SU: 240, APL: 116, ACC: 62, APD: 43, RE: 31, CO: 26 }),
  ...makeDailyRows(demoStart, 31, 'iCX', { SU: 350, APL: 183, ACC: 91, APD: 57, RE: 45, CO: 39 }),
  ...makeDailyRows('2026-11-01', 26, 'oGX', { SU: 291, APL: 142, ACC: 78, APD: 52, RE: 38, CO: 35 }),
  ...makeDailyRows('2026-11-01', 26, 'iCX', { SU: 415, APL: 216, ACC: 111, APD: 69, RE: 51, CO: 48 }),
]

const draftRange = ref({ ...ranges['This month'] })
const appliedRange = ref({ ...ranges['This month'] })
const activePreset = ref<Preset>('This month')
const noticeVisible = ref(true)
const showDates = ref(false)
const interval = ref<(typeof intervals)[number]>('Daily')

const dateError = computed(() => {
  const { start, end } = draftRange.value
  if (!start || !end) return 'Choose a start and end date.'
  if (start > end) return 'End date must be on or after the start date.'
  if (start < '2026-01-01' || end > demoEnd) return 'Choose dates within the 2026 demo period.'
  return ''
})

function selectPreset(preset: Preset) {
  activePreset.value = preset
  showDates.value = preset === 'Custom'
  if (preset !== 'Custom') draftRange.value = { ...ranges[preset] }
}

function applyFilters() {
  if (dateError.value) return
  appliedRange.value = { ...draftRange.value }
  showDates.value = false
}

function clearFilters() {
  selectPreset('This month')
  applyFilters()
}

const filteredRows = computed(() => {
  const { start, end } = appliedRange.value
  return demoRows.filter(({ date }) => date >= start && date <= end)
})

const totals = computed(() => {
  const result = { oGX: emptyCounts(), iCX: emptyCounts() }
  for (const row of filteredRows.value) {
    for (const { key } of phases) {
      result[row.direction][key] += row.counts[key]
    }
  }
  return result
})

function total(phase: Phase) {
  return totals.value.oGX[phase] + totals.value.iCX[phase]
}

function percent(value: number, base: number) {
  return base > 0 ? `${(value * 100 / base).toFixed(1)}%` : '—'
}

const number = new Intl.NumberFormat('en-US')
const fullDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
})
const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', timeZone: 'UTC',
})

function formatDate(date: string, formatter = fullDate) {
  return date ? formatter.format(new Date(`${date}T00:00:00Z`)) : 'Select date'
}

const funnels = computed(() => directions.map((direction) => {
  const counts = totals.value[direction]
  const info = exchange[direction]

  return {
    direction,
    ...info,
    stages: phases.map((phase, index) => {
      const count = counts[phase.key]
      const next = phases[index + 1]

      return {
        ...phase,
        count,
        width: counts.SU ? Math.min(100, count * 100 / counts.SU) : 0,
        color: info.bars[index],
        next: next
          ? { key: next.key, count: counts[next.key], rate: percent(counts[next.key], count) }
          : null,
      }
    }),
  }
}))

const buckets = computed(() => {
  const values = new Map<string, Record<Direction, number>>()
  const firstDay = appliedRange.value.start > demoStart ? appliedRange.value.start : demoStart

  for (const row of filteredRows.value) {
    const elapsed = (Date.parse(row.date) - Date.parse(firstDay)) / 86_400_000
    const date = interval.value === 'Daily'
      ? row.date
      : addDays(firstDay, Math.floor(elapsed / 7) * 7)

    const counts = values.get(date) ?? { oGX: 0, iCX: 0 }
    counts[row.direction] += row.counts.APL
    values.set(date, counts)
  }

  return [...values.entries()].sort(([a], [b]) => a.localeCompare(b))
})

const plot = { left: 44, right: 925, top: 20, bottom: 215 }
const chartMax = computed(() => {
  const highest = Math.max(0, ...buckets.value.flatMap(([, counts]) => [counts.oGX, counts.iCX]))
  return Math.max(4, Math.ceil(highest / 4) * 4)
})

const groupWidth = computed(() => (plot.right - plot.left) / Math.max(1, buckets.value.length))
const barSlot = computed(() => Math.min(30, groupWidth.value * 0.38))
const barWidth = computed(() => barSlot.value * 0.84)

function chartX(index: number) {
  return plot.left + groupWidth.value * (index + 0.5)
}

function chartY(count: number) {
  return plot.bottom - count * (plot.bottom - plot.top) / chartMax.value
}

const chartLabels = computed(() => {
  const last = buckets.value.length - 1
  const labelCount = Math.min(7, buckets.value.length)
  const indices = new Set(Array.from({ length: labelCount }, (_, index) =>
    Math.round(index * last / Math.max(1, labelCount - 1)),
  ))
  return buckets.value
    .map(([date], index) => ({ date, index }))
    .filter(({ index }) => indices.has(index))
})

const chartSeries = computed(() => directions.map((direction, directionIndex) => ({
  direction,
  color: exchange[direction].color,
  bars: buckets.value.map(([date, counts], index) => {
    const count = counts[direction]
    const y = chartY(count)

    return {
      date,
      count,
      x: chartX(index) + (directionIndex - 0.5) * barSlot.value - barWidth.value / 2,
      y,
      height: plot.bottom - y,
    }
  }),
})))

function exportReport() {
  const { start, end } = appliedRange.value
  const headers = [
    'Data source', 'Start date', 'End date', 'Phase', 'Stage',
    ...directions.flatMap((direction) => [`${direction} Count`, `${direction} % of Sign-ups`]),
  ]
  const rows = phases.map(({ key, label }) => [
    'Demo data', start, end, key, label,
    ...directions.flatMap((direction) => {
      const counts = totals.value[direction]
      return [counts[key], counts.SU ? percent(counts[key], counts.SU) : '']
    }),
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `surabaya-demo-${start}-to-${end}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <div class="dashboard-page">
    <div class="top-strip" aria-hidden="true"></div>

    <header class="header">
      <div class="shell header-inner">
        <div class="identity">
          <img class="brand-mark" :src="logoUrl" alt="AIESEC" width="40" height="40" />
          <div>
            <div class="title-row">
              <h1>LC Performance Dashboard</h1>
              <span class="term">2026 Term</span>
            </div>
            <p class="entity">AIESEC in Surabaya<span v-if="!noticeVisible"> · Demo data</span></p>
          </div>
        </div>
        <button class="button primary export" type="button" :disabled="!filteredRows.length" @click="exportReport">
          <span aria-hidden="true">↓</span> Export Report
        </button>
      </div>
    </header>

    <main class="shell dashboard">
      <div v-if="noticeVisible" class="notice">
        <span><strong>Demo data</strong> · Simulated exchange figures.</span>
        <button type="button" aria-label="Dismiss demo banner" @click="noticeVisible = false">×</button>
      </div>

      <form class="panel filters" @submit.prevent="applyFilters">
        <div class="filter-group">
          <button class="button date-button" type="button" :aria-expanded="showDates" @click="showDates = !showDates">
            <span aria-hidden="true">▦</span>
            {{ formatDate(draftRange.start) }} → {{ formatDate(draftRange.end) }}
            <span aria-hidden="true">⌄</span>
          </button>

          <div v-if="showDates" class="button-row custom-dates">
            <label>
              Start date
              <input v-model="draftRange.start" type="date" min="2026-01-01" :max="demoEnd" @input="activePreset = 'Custom'" />
            </label>
            <label>
              End date
              <input v-model="draftRange.end" type="date" min="2026-01-01" :max="demoEnd" @input="activePreset = 'Custom'" />
            </label>
          </div>

          <div class="button-row" role="group" aria-label="Date presets">
            <button
              v-for="preset in presets" :key="preset" class="button" type="button"
              :class="{ selected: activePreset === preset }"
              :aria-pressed="activePreset === preset"
              @click="selectPreset(preset)"
            >{{ preset }}</button>
          </div>
        </div>

        <div class="button-row">
          <button class="button primary" type="submit" :disabled="!!dateError">Apply</button>
          <button class="button" type="button" @click="clearFilters">Clear all</button>
        </div>

        <p v-if="dateError" class="error" role="alert">{{ dateError }}</p>
      </form>

      <p class="sr-only" aria-live="polite">
        Showing {{ formatDate(appliedRange.start) }} to {{ formatDate(appliedRange.end) }}
      </p>

      <p v-if="!filteredRows.length" class="panel empty">
        No demo data for this range. Sample data covers {{ formatDate(demoStart) }} to {{ formatDate(demoEnd) }}.
      </p>

      <template v-else>
        <section class="kpi-grid" aria-label="Performance summary">
          <article v-for="kpi in kpis" :key="kpi.key" class="panel kpi">
            <h2>{{ kpi.label }}</h2>
            <strong class="kpi-value">{{ number.format(total(kpi.key)) }}</strong>
            <div class="kpi-foot">
              <span v-for="direction in directions" :key="direction">
                {{ direction }}:
                <strong :class="direction === 'oGX' ? 'ogx-text' : 'icx-text'">
                  {{ number.format(totals[direction][kpi.key]) }}
                </strong>
              </span>
            </div>
          </article>

          <article class="panel kpi">
            <h2>SU → CO Conversion</h2>
            <strong class="kpi-value">{{ percent(total('CO'), total('SU')) }}</strong>
            <div class="kpi-foot conversion">
              <span>Completed: <strong class="completed-total">{{ number.format(total('CO')) }} EPs</strong> total</span>
              <span class="target" title="Illustrative target for the demo">Target: 10%</span>
            </div>
          </article>
        </section>

        <section class="funnel-grid" aria-label="Exchange funnels">
          <article v-for="funnel in funnels" :key="funnel.direction" class="panel funnel">
            <header class="funnel-heading">
              <span class="dot" :style="{ background: funnel.color }" aria-hidden="true"></span>
              <div>
                <h2>{{ funnel.direction }} Funnel Performance</h2>
                <p>{{ funnel.description }}</p>
              </div>
            </header>

            <div v-for="stage in funnel.stages" :key="stage.key" class="stage">
              <p class="stage-label"><strong>{{ stage.key }}</strong> {{ stage.label }}</p>
              <div>
                <div class="track">
                  <span class="fill" :style="{ width: `${stage.width}%`, background: stage.color }"></span>
                  <strong class="bar-count">{{ number.format(stage.count) }}</strong>
                </div>
                <p v-if="stage.next" class="step-rate">
                  {{ stage.key }} → {{ stage.next.key }}
                  <strong>{{ stage.next.rate }}</strong>
                  <span>({{ number.format(stage.next.count) }})</span>
                </p>
              </div>
            </div>
          </article>
        </section>

        <section class="panel table-panel" aria-labelledby="table-title">
          <div class="section-heading">
            <div>
              <h2 id="table-title">Exchange Funnel Conversion Table</h2>
              <p>Cross-program comparison across exchange phases</p>
            </div>
            <span class="order">Phase Order (SU → CO)</span>
          </div>
          <div class="table-scroll" tabindex="0" role="region" aria-label="Exchange funnel comparison">
            <table>
              <thead>
                <tr>
                  <th scope="col">Phase</th>
                  <th scope="col">Stage Name</th>
                  <template v-for="direction in directions" :key="direction">
                    <th scope="col">{{ direction }} Count</th>
                    <th scope="col">{{ direction }} % of Sign-ups</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-for="phase in phases" :key="phase.key">
                  <th scope="row">{{ phase.key }}</th>
                  <td>{{ phase.label }}</td>
                  <template v-for="direction in directions" :key="direction">
                    <td><strong>{{ number.format(totals[direction][phase.key]) }}</strong></td>
                    <td>{{ percent(totals[direction][phase.key], totals[direction].SU) }}</td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel chart-panel" aria-labelledby="chart-title">
          <div class="section-heading">
            <div>
              <h2 id="chart-title">Performance Over Time</h2>
              <p>{{ interval === 'Daily' ? 'Applications per day' : 'Applications per seven-day period' }}</p>
            </div>
            <div class="chart-controls">
              <span v-for="series in chartSeries" :key="series.direction" class="legend">
                <i :style="{ background: series.color }" aria-hidden="true"></i>{{ series.direction }}
              </span>
              <div class="segmented" role="group" aria-label="Chart interval">
                <button
                  v-for="option in intervals" :key="option" type="button"
                  :aria-pressed="interval === option"
                  @click="interval = option"
                >{{ option }}</button>
              </div>
            </div>
          </div>

          <div class="chart-scroll" tabindex="0" role="region" aria-label="Application count chart">
            <svg class="chart" viewBox="0 0 945 248" role="img" aria-labelledby="chart-description">
              <title id="chart-description">{{ interval }} application counts for oGX and iCX</title>
              <g v-for="tick in 5" :key="tick">
                <line
                  :x1="plot.left" :x2="plot.right"
                  :y1="chartY(chartMax * (tick - 1) / 4)"
                  :y2="chartY(chartMax * (tick - 1) / 4)"
                  :stroke="tick === 1 ? '#aab5c3' : '#e8ecf0'"
                />
                <text
                  :x="plot.left - 9"
                  :y="chartY(chartMax * (tick - 1) / 4) + 4"
                  text-anchor="end"
                >{{ chartMax * (tick - 1) / 4 }}</text>
              </g>

              <g v-for="series in chartSeries" :key="series.direction">
                <rect
                  v-for="bar in series.bars" :key="bar.date"
                  :x="bar.x" :y="bar.y" :width="barWidth" :height="bar.height"
                  :fill="series.color" rx="2"
                >
                  <title>{{ series.direction }} · {{ interval === 'Weekly' ? 'Starting ' : '' }}{{ formatDate(bar.date) }} · {{ bar.count }} applied</title>
                </rect>
              </g>

              <text
                v-for="label in chartLabels" :key="label.date"
                :x="chartX(label.index)" y="236" text-anchor="middle"
              >{{ formatDate(label.date, shortDate) }}</text>
            </svg>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style>
:root {
  font-family: Poppins, "Segoe UI", system-ui, sans-serif;
  font-synthesis: none;
  color: #141c2d;
  background: #f3f3f3;
}

* { box-sizing: border-box; }
body { display: block; min-width: 0; min-height: 100vh; margin: 0; }
#app { width: 100%; max-width: none; margin: 0; padding: 0; text-align: left; }
h1, h2, p { margin: 0; }
button, input { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .55; }
:focus-visible { outline: 2px solid #007ef0; outline-offset: 3px; }

.dashboard-page {
  --blue: #007ef0;
  --muted: #646e81;
  --border: #e2e6ec;
  min-height: 100vh;
  background: #f3f3f3;
  color: #141c2d;
  font-size: 14px;
}

.shell { width: min(100%, 1440px); margin-inline: auto; padding-inline: 34px; }
.top-strip { height: 48px; background: #0c1f37; }
.header { border-bottom: 1px solid var(--border); background: #fff; }
.header-inner, .identity, .title-row { display: flex; align-items: center; }
.header-inner { justify-content: space-between; gap: 16px; min-height: 80px; padding-block: 14px; }
.identity { gap: 14px; }
.title-row { flex-wrap: wrap; gap: 8px; }
.brand-mark { display: block; flex: none; width: 40px; height: 40px; object-fit: contain; }
h1 { font-size: clamp(17px, 2vw, 22px); line-height: 1.2; font-weight: 750; }
h2 { font-size: 16px; line-height: 1.3; font-weight: 750; }

.term {
  padding: 3px 8px;
  border-radius: 99px;
  background: #edf5ff;
  color: #006dce;
  font-size: 11px;
  font-weight: 650;
}

.entity { margin-top: 5px; color: var(--muted); }

.entity::before {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: #09b482;
  content: "";
}

.dashboard { padding-block: 16px 72px; }

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 49px;
  margin-bottom: 16px;
  padding: 9px 16px;
  border: 1px solid #ffd575;
  border-radius: 12px;
  background: #fff8e8;
  color: #542900;
}

.notice button { border: 0; background: transparent; color: inherit; font-size: 21px; }

.panel {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 4px #1726410b;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 14px;
  margin-bottom: 46px;
  padding: 16px;
}

.filter-group { display: grid; min-width: 0; justify-items: start; gap: 11px; }
.button-row { display: flex; flex-wrap: wrap; gap: 7px; }

.button, .segmented button {
  min-height: 29px;
  padding: 5px 11px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: #f0f1f3;
  color: #344155;
  font-size: 12px;
  font-weight: 550;
}

.button.primary { background: var(--blue); color: #fff; }
.button.export { min-height: 40px; padding-inline: 16px; border-radius: 11px; white-space: nowrap; }
.button.selected { border-color: #b8d9fb; background: #edf5ff; color: #006acc; }

.button.date-button {
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 36px;
  border-color: #ccd3dc;
  background: #f7f8fa;
}

.custom-dates label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; }

.custom-dates input {
  min-height: 36px;
  padding: 4px 8px;
  border: 1px solid #ccd3dc;
  border-radius: 7px;
  background: #fff;
  color: #222d40;
  color-scheme: light;
}

.segmented {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f0f1f3;
}

.segmented button { min-height: 25px; padding-block: 2px; background: transparent; }
.segmented button[aria-pressed="true"] { background: #fff; color: #131d30; font-weight: 700; }
.error { flex-basis: 100%; color: #ab2626; }
.empty { padding: 22px; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.kpi-grid, .funnel-grid { display: grid; margin-bottom: 24px; }
.kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.funnel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.kpi { padding: 20px; }
.kpi h2 { color: var(--muted); font-size: 11px; letter-spacing: .045em; text-transform: uppercase; }
.kpi-value { display: block; margin: 9px 0 11px; font-size: clamp(25px, 3vw, 34px); line-height: 1.1; }

.kpi-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-height: 26px;
  padding-top: 8px;
  border-top: 1px solid #edf0f3;
  color: var(--muted);
  font-size: 11px;
}

.ogx-text { color: #bc3f2c; }
.icx-text { color: #006ac6; }
.completed-total { color: #007c5a; white-space: nowrap; }
.kpi-foot.conversion { justify-content: space-between; }
.target, .order { padding: 3px 7px; border-radius: 5px; background: #eef3f8; color: #415068; font-size: 11px; }

.funnel { padding: 24px; }

.funnel-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #edf0f3;
}

.funnel-heading p, .section-heading p { margin-top: 2px; color: var(--muted); font-size: 12px; }
.dot { flex: 0 0 12px; height: 12px; border-radius: 50%; }
.stage { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 8px; margin-top: 10px; }
.stage-label { padding-top: 5px; color: #697488; font-size: 10px; }
.stage-label strong { color: #465368; font-size: 11px; }

.track {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  overflow: hidden;
  border-radius: 8px;
  background: #f0f1f3;
}

.fill { position: absolute; inset: 0 auto 0 0; border-radius: inherit; }

.bar-count {
  position: relative;
  margin-left: 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 750;
  text-shadow: 0 1px 2px #141c2dcc, 0 0 3px #141c2db3;
}

.step-rate {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0 0 4px;
  padding: 2px 8px;
  border: 1px solid #dce5ef;
  border-radius: 30px;
  background: #eef3f8;
  color: #44536a;
  font-size: 11px;
}

.step-rate strong { color: #1c2839; }
.table-panel { margin-bottom: 24px; overflow: hidden; }

.section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 22px 20px 19px;
}

.order { padding: 6px 11px; border: 1px solid var(--border); background: #f7f8fa; }
.table-scroll, .chart-scroll { overflow-x: auto; }
table { width: 100%; min-width: 590px; border-collapse: collapse; font-size: 12px; }
th, td { padding: 12px 16px; border-top: 1px solid #edf0f3; text-align: right; white-space: nowrap; }
th:first-child, th:nth-child(2), td:nth-child(2) { text-align: left; }
th:first-child { padding-left: 20px; }
thead th { background: #f5f7f9; color: #44536a; }
tbody tr:nth-child(odd) { background: #fafbfc; }
tbody th { color: #0c2544; }

.chart-panel .section-heading { margin-inline: 24px; padding-inline: 0; border-bottom: 1px solid #edf0f3; }
.chart-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.legend { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
.legend i { width: 9px; height: 9px; border-radius: 2px; }
.chart-scroll { margin: 8px 20px 14px; }
.chart { display: block; width: 100%; min-width: 640px; }
.chart text { fill: #526178; font-size: 12px; }

@media (max-width: 820px) {
  .shell { padding-inline: 20px; }
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .funnel-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 540px) {
  .shell { padding-inline: 14px; }
  .top-strip { height: 20px; }
  .header-inner { flex-wrap: wrap; }
  .dashboard { padding-bottom: 28px; }
  .filters { align-items: start; margin-bottom: 24px; }
  .button, .segmented button { min-height: 36px; }
  .kpi-grid { gap: 10px; }
  .kpi, .funnel { padding: 14px; }
  .stage { grid-template-columns: 75px minmax(0, 1fr); }
  .chart-panel .section-heading { margin-inline: 14px; }
  .chart-scroll { margin-inline: 8px; }
  .chart text { font-size: 15px; }
}
</style>
