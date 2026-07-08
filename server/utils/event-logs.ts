import { createError } from 'h3'
import type {
  AppEvent,
  EventLogSettings,
  PaginatedEvents
} from '../../shared/types'
import { prisma } from './prisma'

const eventClearCronKey = 'eventLogClearCron'
const eventLastClearedAtKey = 'eventLogLastClearedAt'
const defaultPageSize = 25
const maxPageSize = 100
const minuteMs = 60 * 1000
const maxScheduleLookbackMs = 366 * 24 * 60 * minuteMs

interface SettingRow {
  key: string
  value: string | null
}

interface CronField {
  wildcard: boolean
  values: Set<number>
}

interface ParsedCron {
  minute: CronField
  hour: CronField
  dayOfMonth: CronField
  month: CronField
  dayOfWeek: CronField
}

let settingsTableReady: Promise<void> | undefined

export async function listEventLogs(input: {
  page?: number
  pageSize?: number
} = {}): Promise<PaginatedEvents> {
  const settings = await getEventLogSettings()
  await applyEventLogSchedule(settings)

  const pageSize = normalizePageSize(input.pageSize)
  const requestedPage = normalizePage(input.page)
  const total = await prisma.appEvent.count()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, totalPages)

  const events = await prisma.appEvent.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize
  })

  return {
    events: events.map((event) => ({
      id: event.id,
      type: event.type as AppEvent['type'],
      message: event.message,
      accountId: event.accountId || undefined,
      createdAt: event.createdAt.toISOString()
    })),
    total,
    page,
    pageSize,
    totalPages,
    settings
  }
}

export async function clearEventLogs() {
  const result = await prisma.appEvent.deleteMany()
  await saveSetting(eventLastClearedAtKey, new Date().toISOString())
  return result
}

export async function getEventLogSettings(): Promise<EventLogSettings> {
  await ensureAppSettingTable()

  const rows = await prisma.$queryRawUnsafe<SettingRow[]>(
    'SELECT key, value FROM AppSetting WHERE key IN (?, ?)',
    eventClearCronKey,
    eventLastClearedAtKey
  )
  const settings = Object.fromEntries(
    rows.map((row) => [row.key, row.value || ''])
  )
  const clearCron = parseCronExpression(settings[eventClearCronKey], '')
  const lastClearedAt = parseOptionalDate(settings[eventLastClearedAtKey])

  return {
    clearCron,
    lastClearedAt: lastClearedAt?.toISOString()
  }
}

export async function saveEventLogSettings(input: {
  clearCron: unknown
}): Promise<EventLogSettings> {
  const clearCron = parseCronExpression(input.clearCron, '')
  const lastClearedAt = new Date().toISOString()

  await ensureAppSettingTable()
  await saveSetting(eventClearCronKey, clearCron)
  await saveSetting(eventLastClearedAtKey, lastClearedAt)

  return { clearCron, lastClearedAt }
}

export async function applyEventLogSchedule(settings?: EventLogSettings) {
  const activeSettings = settings || await getEventLogSettings()

  if (!activeSettings.clearCron) {
    return { count: 0 }
  }

  const lastClearedAt = activeSettings.lastClearedAt
    ? new Date(activeSettings.lastClearedAt)
    : undefined

  if (!lastClearedAt || Number.isNaN(lastClearedAt.getTime())) {
    await saveSetting(eventLastClearedAtKey, new Date().toISOString())
    return { count: 0 }
  }

  const now = new Date()

  if (!cronWasDueBetween(activeSettings.clearCron, lastClearedAt, now)) {
    return { count: 0 }
  }

  const result = await prisma.appEvent.deleteMany()
  await saveSetting(eventLastClearedAtKey, now.toISOString())
  return result
}

function parseCronExpression(value: unknown, fallback?: string) {
  if ((value === undefined || value === null) && fallback !== undefined) {
    return fallback
  }

  const expression = String(value ?? '').trim()

  if (!expression) {
    return ''
  }

  parseCron(expression)
  return expression.replace(/\s+/g, ' ')
}

function cronWasDueBetween(expression: string, lastClearedAt: Date, now: Date) {
  if (now.getTime() <= lastClearedAt.getTime()) {
    return false
  }

  if (now.getTime() - lastClearedAt.getTime() > maxScheduleLookbackMs) {
    return true
  }

  const cron = parseCron(expression)
  const end = floorToMinute(now).getTime()
  let cursor = floorToMinute(new Date(lastClearedAt.getTime() + minuteMs)).getTime()

  while (cursor <= end) {
    if (cronMatches(cron, new Date(cursor))) {
      return true
    }

    cursor += minuteMs
  }

  return false
}

function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/)

  if (parts.length !== 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cron expression must use 5 fields'
    })
  }

  const [minute = '', hour = '', dayOfMonth = '', month = '', dayOfWeek = ''] = parts

  return {
    minute: parseCronField(minute, 0, 59),
    hour: parseCronField(hour, 0, 23),
    dayOfMonth: parseCronField(dayOfMonth, 1, 31),
    month: parseCronField(month, 1, 12),
    dayOfWeek: parseCronField(dayOfWeek, 0, 7)
  }
}

function parseCronField(field: string, min: number, max: number): CronField {
  if (field === '*') {
    return {
      wildcard: true,
      values: valuesBetween(min, max)
    }
  }

  const values = new Set<number>()

  for (const part of field.split(',')) {
    const [range = '', stepValue] = part.split('/')
    const step = stepValue === undefined ? 1 : Number(stepValue)

    if (!Number.isInteger(step) || step < 1) {
      throw invalidCron()
    }

    const [startValue = '', endValue] = range.split('-')
    const start = range === '*' ? min : Number(startValue)
    const end = range === '*'
      ? max
      : endValue === undefined
        ? start
        : Number(endValue)

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < min ||
      end > max ||
      start > end
    ) {
      throw invalidCron()
    }

    for (let value = start; value <= end; value += step) {
      values.add(value)
    }
  }

  if (!values.size) {
    throw invalidCron()
  }

  return {
    wildcard: values.size === max - min + 1,
    values
  }
}

function cronMatches(cron: ParsedCron, date: Date) {
  const dayOfWeek = date.getDay()
  const dayOfWeekMatches =
    cron.dayOfWeek.values.has(dayOfWeek) ||
    (dayOfWeek === 0 && cron.dayOfWeek.values.has(7))
  const dayOfMonthMatches = cron.dayOfMonth.values.has(date.getDate())
  const dayMatches =
    cron.dayOfMonth.wildcard || cron.dayOfWeek.wildcard
      ? dayOfMonthMatches && dayOfWeekMatches
      : dayOfMonthMatches || dayOfWeekMatches

  return (
    cron.minute.values.has(date.getMinutes()) &&
    cron.hour.values.has(date.getHours()) &&
    dayMatches &&
    cron.month.values.has(date.getMonth() + 1)
  )
}

function valuesBetween(min: number, max: number) {
  const values = new Set<number>()

  for (let value = min; value <= max; value += 1) {
    values.add(value)
  }

  return values
}

function invalidCron() {
  return createError({
    statusCode: 400,
    statusMessage: 'Invalid cron expression'
  })
}

function floorToMinute(date: Date) {
  const result = new Date(date)
  result.setSeconds(0, 0)
  return result
}

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function normalizePage(value: unknown) {
  const page = Number(value)

  if (!Number.isInteger(page) || page < 1) {
    return 1
  }

  return page
}

function normalizePageSize(value: unknown) {
  const pageSize = Number(value)

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return defaultPageSize
  }

  return Math.min(pageSize, maxPageSize)
}

async function ensureAppSettingTable() {
  if (!settingsTableReady) {
    settingsTableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS AppSetting (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).then(() => undefined)
  }

  await settingsTableReady
}

async function saveSetting(key: string, value: string) {
  await ensureAppSettingTable()
  await prisma.$executeRawUnsafe(
    `INSERT INTO AppSetting (key, value, updatedAt)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updatedAt = CURRENT_TIMESTAMP`,
    key,
    value
  )
}
