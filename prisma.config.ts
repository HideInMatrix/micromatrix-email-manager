import { defineConfig } from 'prisma/config'

const databaseProvider = (process.env.DATABASE_PROVIDER || 'sqlite').trim().toLowerCase()

if (databaseProvider !== 'sqlite' && databaseProvider !== 'postgresql') {
  throw new Error('DATABASE_PROVIDER must be "sqlite" or "postgresql".')
}

const databaseUrl = process.env.DATABASE_URL || (
  databaseProvider === 'sqlite'
    ? 'file:./.data/micromatrix-email-manager.sqlite'
    : ''
)

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required when DATABASE_PROVIDER is "postgresql".')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: `prisma/migrations/${databaseProvider}`
  },
  datasource: {
    url: databaseUrl
  }
})
