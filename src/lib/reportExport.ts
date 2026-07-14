import type { PoolProfile, TestEntry } from '../types'

const COLUMNS: Array<{ key: keyof TestEntry; label: string }> = [
  { key: 'fc', label: 'FC' },
  { key: 'cc', label: 'CC' },
  { key: 'ph', label: 'pH' },
  { key: 'ta', label: 'TA' },
  { key: 'ch', label: 'CH' },
  { key: 'cya', label: 'CYA' },
  { key: 'salt', label: 'Salt' },
  { key: 'tds', label: 'TDS' },
  { key: 'waterTempF', label: 'Temp (°F)' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportTestsAsCsv(pool: PoolProfile, tests: TestEntry[]) {
  const chronological = [...tests].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const header = ['Date', ...COLUMNS.map((c) => c.label), 'Notes']
  const rows = chronological.map((t) => [
    new Date(t.timestamp).toLocaleString(),
    ...COLUMNS.map((c) => (t[c.key] !== undefined ? String(t[c.key]) : '')),
    t.notes ?? '',
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${pool.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-tests-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function exportTestsAsPdf(pool: PoolProfile, tests: TestEntry[]) {
  const [{ default: jsPDF }, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text(`Pool Boy — ${pool.name} test history`, 14, 16)
  doc.setFontSize(10)
  doc.text(
    `${pool.volumeGallons.toLocaleString()} gal · ${pool.surfaceType} · ${pool.sanitizerType === 'salt' ? 'SWG' : 'chlorine'} · generated ${new Date().toLocaleDateString()}`,
    14,
    22,
  )

  const chronological = [...tests].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const head = [['Date', ...COLUMNS.map((c) => c.label), 'Notes']]
  const body = chronological.map((t) => [
    new Date(t.timestamp).toLocaleString(),
    ...COLUMNS.map((c) => (t[c.key] !== undefined ? String(t[c.key]) : '—')),
    t.notes ?? '',
  ])

  autoTable.default(doc, {
    head,
    body,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [2, 132, 199] },
  })

  doc.save(`${pool.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-tests-${new Date().toISOString().slice(0, 10)}.pdf`)
}
