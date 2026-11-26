const periods = [
  {
    start: '2026-10-01',
    days: 31,
    oGX: { SU: 240, APL: 116, ACC: 62, APD: 43, RE: 31, CO: 26 },
    iCX: { SU: 350, APL: 183, ACC: 91, APD: 57, RE: 45, CO: 39 },
  },
  {
    start: '2026-11-01',
    days: 26,
    oGX: { SU: 291, APL: 142, ACC: 78, APD: 52, RE: 38, CO: 35 },
    iCX: { SU: 415, APL: 216, ACC: 111, APD: 69, RE: 51, CO: 48 },
  },
]

function makeDailyRows(start, days, direction, totals) {
  const weights = Array.from({ length: days }, (_, index) => {
    const progress = index / (days - 1)
    const dip = Math.exp(-Math.pow((progress - 0.42) / 0.16, 2))
    return 0.65 + progress * 0.85 - dip * (direction === 'oGX' ? 0.34 : 0.2)
  })

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let usedWeight = 0

  return weights.map((weight, index) => {
    const before = usedWeight / totalWeight
    usedWeight += weight
    const after = index === days - 1 ? 1 : usedWeight / totalWeight
    const counts = Object.fromEntries(
      Object.entries(totals).map(([phase, total]) => [
        phase,
        Math.floor(total * after) - Math.floor(total * before),
      ]),
    )

    const date = new Date(start + 'T00:00:00Z')
    date.setUTCDate(date.getUTCDate() + index)
    return { date: date.toISOString().slice(0, 10), direction, counts }
  })
}

const rows = periods.flatMap(({ start, days, oGX, iCX }) => [
  ...makeDailyRows(start, days, 'oGX', oGX),
  ...makeDailyRows(start, days, 'iCX', iCX),
])

export default function performance(request) {
  if (request.method !== 'GET') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { Allow: 'GET' } },
    )
  }

  return Response.json({ source: 'demo', rows })
}
