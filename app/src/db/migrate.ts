import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const runMigrations = async () => {
  console.log('Running migrations...')

  const connectionString = process.env.DATABASE_URL!
  const sql = postgres(connectionString, { max: 1 })
  const db = drizzle(sql)

  await migrate(db, { migrationsFolder: './src/db/migrations' })

  await sql.end()

  console.log('Migrations completed!')
}

runMigrations().catch((err) => {
  console.error('Migration failed!')
  console.error(err)
  process.exit(1)
})
