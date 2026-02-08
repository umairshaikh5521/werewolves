import { ConvexHttpClient } from 'convex/browser'
import { api } from './convex/_generated/api.js'

const client = new ConvexHttpClient('https://pleasant-jackal-424.convex.cloud')

try {
  const result = await client.mutation(api.migrations.cleanupDeadChannelMessages)
  console.log('Cleanup complete:', result)
  process.exit(0)
} catch (error) {
  console.error('Cleanup failed:', error)
  process.exit(1)
}
