import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const defaultDatabaseUrl = 'file:./.data/micromatrix-email-manager.sqlite'
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl

process.env.DATABASE_URL ||= databaseUrl

function ensureSqliteDirectory(url: string) {
  if (!url.startsWith('file:')) {
    return
  }

  const rawPath = url.slice('file:'.length)
  const sqlitePath = rawPath.startsWith('/')
    ? rawPath
    : resolve(process.cwd(), rawPath)

  mkdirSync(dirname(sqlitePath), { recursive: true })
}

ensureSqliteDirectory(databaseUrl)

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaBetterSqlite3(
      { url: databaseUrl },
      { timestampFormat: 'iso8601' }
    )
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
