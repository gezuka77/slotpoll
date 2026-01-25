import { requireAuth } from '@/lib/auth/session'
import CreatePollClient from './CreatePollClient'

export default async function CreatePollPage() {
  await requireAuth()
  return <CreatePollClient />
}
