import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient as PostgresqlPrismaClient } from '../generated/prisma/postgresql/client'
import { PrismaClient as SqlitePrismaClient } from '../generated/prisma/sqlite/client'

type DatabaseProvider = 'sqlite' | 'postgresql'
type AppPrismaClient = SqlitePrismaClient

const rawDatabaseProvider = (process.env.DATABASE_PROVIDER || 'sqlite').trim().toLowerCase()

if (rawDatabaseProvider !== 'sqlite' && rawDatabaseProvider !== 'postgresql') {
  throw new Error('DATABASE_PROVIDER must be "sqlite" or "postgresql".')
}

const databaseProvider: DatabaseProvider = rawDatabaseProvider
const defaultDatabaseUrl = 'file:./.data/micromatrix-email-manager.sqlite'
const databaseUrl = process.env.DATABASE_URL || (
  databaseProvider === 'sqlite' ? defaultDatabaseUrl : ''
)

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required when DATABASE_PROVIDER is "postgresql".')
}

if (databaseProvider === 'sqlite' && !databaseUrl.startsWith('file:')) {
  throw new Error('SQLite DATABASE_URL must start with "file:".')
}

if (
  databaseProvider === 'postgresql' &&
  !databaseUrl.startsWith('postgresql://') &&
  !databaseUrl.startsWith('postgres://')
) {
  throw new Error('PostgreSQL DATABASE_URL must start with "postgresql://" or "postgres://".')
}

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

if (databaseProvider === 'sqlite') {
  ensureSqliteDirectory(databaseUrl)
}

const globalForPrisma = globalThis as unknown as {
  prisma?: AppPrismaClient
}

function createPrismaClient(): AppPrismaClient {
  if (databaseProvider === 'postgresql') {
    const adapter = new PrismaPg({ connectionString: databaseUrl })
    return new PostgresqlPrismaClient({ adapter }) as unknown as AppPrismaClient
  }

  const adapter = new PrismaBetterSqlite3(
    { url: databaseUrl },
    { timestampFormat: 'iso8601' }
  )
  return new SqlitePrismaClient({ adapter })
}

export const prisma =
  globalForPrisma.prisma ||
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
