import { relations } from 'drizzle-orm'
import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core'

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_user', 'admin', 'normal'])
export const voteTypeEnum = pgEnum('vote_type', ['yes', 'no', 'maybe'])
export const pollStatusEnum = pgEnum('poll_status', ['draft', 'active', 'closed'])

// NextAuth Tables (singular table names, camelCase columns, text IDs to match database)
export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('normal'),
  suspended: boolean('suspended').notNull().default(false),
  lastSeenAt: timestamp('lastSeenAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
})

export const accounts = pgTable('account', {
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => ({
  compoundKey: primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
}))

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}))

// Application Tables (text IDs and camelCase columns to match database)
export const polls = pgTable('polls', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  creatorId: text('creatorId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: pollStatusEnum('status').notNull().default('active'),
  uniqueLink: text('uniqueLink').notNull().unique(),
  allowComments: boolean('allowComments').notNull().default(true),
  allowMaybe: boolean('allowMaybe').notNull().default(true),
  requireName: boolean('requireName').notNull().default(true),
  requireEmail: boolean('requireEmail').notNull().default(false),
  isPublic: boolean('isPublic').notNull().default(true),
  deadline: timestamp('deadline', { mode: 'date' }),
  maxVotesPerParticipant: integer('maxVotesPerParticipant'),
  password: text('password'),
  closedAt: timestamp('closedAt', { mode: 'date' }),
  autoClosedAt: timestamp('autoClosedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
})

export const slots = pgTable('slots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  pollId: text('pollId')
    .notNull()
    .references(() => polls.id, { onDelete: 'cascade' }),
  startTime: timestamp('startTime', { mode: 'date' }).notNull(),
  endTime: timestamp('endTime', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
})

export const participants = pgTable('participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  pollId: text('pollId')
    .notNull()
    .references(() => polls.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
})

export const votes = pgTable('votes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slotId: text('slotId')
    .notNull()
    .references(() => slots.id, { onDelete: 'cascade' }),
  participantId: text('participantId')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  voteType: voteTypeEnum('voteType').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
})

export const comments = pgTable('comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  pollId: text('pollId')
    .notNull()
    .references(() => polls.id, { onDelete: 'cascade' }),
  participantId: text('participantId')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
})

export const lifetimeStats = pgTable('lifetimeStats', {
  id: text('id').primaryKey(),
  deletedUsers: integer('deletedUsers').notNull().default(0),
  deletedPolls: integer('deletedPolls').notNull().default(0),
  deletedSlots: integer('deletedSlots').notNull().default(0),
  deletedParticipants: integer('deletedParticipants').notNull().default(0),
  deletedVotes: integer('deletedVotes').notNull().default(0),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  polls: many(polls),
  accounts: many(accounts),
  sessions: many(sessions),
}))

export const pollsRelations = relations(polls, ({ one, many }) => ({
  creator: one(users, {
    fields: [polls.creatorId],
    references: [users.id],
  }),
  slots: many(slots),
  participants: many(participants),
  comments: many(comments),
}))

export const slotsRelations = relations(slots, ({ one, many }) => ({
  poll: one(polls, {
    fields: [slots.pollId],
    references: [polls.id],
  }),
  votes: many(votes),
}))

export const participantsRelations = relations(participants, ({ one, many }) => ({
  poll: one(polls, {
    fields: [participants.pollId],
    references: [polls.id],
  }),
  votes: many(votes),
  comments: many(comments),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  slot: one(slots, {
    fields: [votes.slotId],
    references: [slots.id],
  }),
  participant: one(participants, {
    fields: [votes.participantId],
    references: [participants.id],
  }),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  poll: one(polls, {
    fields: [comments.pollId],
    references: [polls.id],
  }),
  participant: one(participants, {
    fields: [comments.participantId],
    references: [participants.id],
  }),
}))

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Poll = typeof polls.$inferSelect
export type NewPoll = typeof polls.$inferInsert
export type Slot = typeof slots.$inferSelect
export type NewSlot = typeof slots.$inferInsert
export type Participant = typeof participants.$inferSelect
export type NewParticipant = typeof participants.$inferInsert
export type Vote = typeof votes.$inferSelect
export type NewVote = typeof votes.$inferInsert
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
export type LifetimeStats = typeof lifetimeStats.$inferSelect
