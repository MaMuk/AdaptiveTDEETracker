#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseArgs(argv) {
  const args = { type: null, input: null, output: null }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--type') args.type = argv[i + 1]
    if (token === '--input') args.input = argv[i + 1]
    if (token === '--output') args.output = argv[i + 1]
  }
  return args
}

function toMondayKey(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  const day = d.getUTCDay() // 0=Sun ... 6=Sat
  const delta = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - delta)
  return d.toISOString().slice(0, 10)
}

function weekdayKey(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  const day = d.getUTCDay()
  if (day === 0) return 'Sun'
  return WEEKDAY_KEYS[day - 1]
}

function csvCell(value) {
  if (value === null || value === undefined || value === '') return ''
  const s = String(value)
  if (!/[",\n]/.test(s)) return s
  return `"${s.replaceAll('"', '""')}"`
}

function rowToCsv(row) {
  return row.map(csvCell).join(',')
}

function readLogs(payload) {
  const logs = payload?.sections?.logs?.logs
  if (!Array.isArray(logs)) {
    throw new Error('Invalid backup format: expected sections.logs.logs array')
  }
  return logs
}

function detectBackupType(payload) {
  const sectionKeys = Object.keys(payload?.sections || {})
  if (sectionKeys.length === 1 && sectionKeys[0] === 'logs') return 'log'
  return 'full'
}

function printUsage() {
  console.log('Usage: npm run export:sheet-csv -- --input <file.json> [--output file.csv]')
  console.log('Example: npm run export:sheet-csv -- --input tdee-backup-2026-05-28.json')
}

function buildWeeklyRows(logs) {
  const sorted = [...logs]
    .filter((item) => item && typeof item.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length === 0) return []

  const byWeek = new Map()
  for (const entry of sorted) {
    const weekStart = toMondayKey(entry.date)
    if (!byWeek.has(weekStart)) {
      byWeek.set(weekStart, {
        weight: { Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '' },
        calories: { Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '' }
      })
    }
    const day = weekdayKey(entry.date)
    const bucket = byWeek.get(weekStart)
    bucket.weight[day] = Number.isFinite(Number(entry.weight)) ? Number(entry.weight) : ''
    bucket.calories[day] = Number.isFinite(Number(entry.calories)) ? Number(entry.calories) : ''
  }

  const weeks = [...byWeek.keys()].sort((a, b) => a.localeCompare(b))
  const rows = []
  for (const weekStart of weeks) {
    const bucket = byWeek.get(weekStart)
    rows.push([
      weekStart,
      'Weight',
      ...WEEKDAY_KEYS.map((key) => bucket.weight[key])
    ])
    rows.push([
      '',
      'Cal.',
      ...WEEKDAY_KEYS.map((key) => bucket.calories[key])
    ])
  }
  return rows
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.input) {
    printUsage()
    process.exit(1)
  }

  const inputPath = args.input
  const source = fs.readFileSync(path.resolve(inputPath), 'utf8')
  const payload = JSON.parse(source)
  const detectedType = detectBackupType(payload)
  const outputPath = args.output || `sheet-log-${detectedType}.csv`
  const logs = readLogs(payload)
  const rows = buildWeeklyRows(logs)

  const header = ['Week Start Date', 'Stats', ...WEEKDAY_KEYS]
  const csv = [rowToCsv(header), ...rows.map(rowToCsv)].join('\n')
  fs.writeFileSync(path.resolve(outputPath), `${csv}\n`, 'utf8')

  console.log(`Detected ${detectedType} backup. Wrote ${rows.length} data rows to ${outputPath}`)
}

main()
