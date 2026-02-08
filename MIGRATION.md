# Migration: Remove Dead Channel Messages

## Background
We've removed the graveyard chat feature. Dead players now view their team's chat (wolves see wolf chat, villagers see village chat) but cannot send messages.

## Required Data Cleanup

Old chat messages with `channel: 'dead'` still exist in the database and need to be removed before we can fully remove the 'dead' channel type from the schema.

## How to Clean Up

### Option 1: Using the Convex Dashboard
1. Go to your Convex dashboard
2. Navigate to the `chat` table
3. Delete all records where `channel = 'dead'`

### Option 2: Using the Migration Script
Run the cleanup script from your terminal:

```bash
# Make sure your Convex dev server is running
npx convex dev

# In another terminal, run:
node cleanup-dead-messages.mjs
```

## After Cleanup

Once all dead channel messages are deleted, you can remove the deprecated 'dead' channel from the schema:

In `convex/schema.ts`, change:
```typescript
export const chatChannelValidator = v.union(
  v.literal('global'),
  v.literal('wolves'),
  v.literal('dead')  // Remove this line
)
```

to:
```typescript
export const chatChannelValidator = v.union(
  v.literal('global'),
  v.literal('wolves')
)
```

Then you can delete these files:
- `convex/migrations.ts`
- `cleanup-dead-messages.mjs`
- `MIGRATION.md` (this file)
