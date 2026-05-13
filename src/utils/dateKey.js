function pad2(value) {
  return String(value).padStart(2, '0')
}

export function formatDateKeyLocal(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${year}-${month}-${day}`
}

export function todayKey() {
  return formatDateKeyLocal(new Date())
}

export function parseDateKey(dateKey) {
  const text = String(dateKey || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return new Date(NaN)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return new Date(year, month - 1, day)
}

export function addDays(dateKey, days) {
  const date = parseDateKey(dateKey)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + Number(days))
  return formatDateKeyLocal(date)
}

export function dateKeyToTime(dateKey) {
  return parseDateKey(dateKey).getTime()
}

export function diffDays(aDateKey, bDateKey) {
  const a = dateKeyToTime(aDateKey)
  const b = dateKeyToTime(bDateKey)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN
  return Math.round((b - a) / 86400000)
}
