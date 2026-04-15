import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Stores Facebook Messenger conversations with per-user message history.
 * Each row represents a conversation thread with a unique Facebook user.
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  /** Facebook sender ID (unique identifier for each user) */
  senderId: varchar("senderId", { length: 255 }).notNull().unique(),
  /** User's name from Facebook profile */
  senderName: varchar("senderName", { length: 255 }),
  /** JSON array of message objects: { role, content, timestamp } */
  messages: text("messages").notNull(),
  /** Last message timestamp for sorting */
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Tracks bot activity for monitoring and debugging.
 */
export const botActivity = mysqlTable("botActivity", {
  id: int("id").autoincrement().primaryKey(),
  /** Type of activity: 'message_received', 'response_sent', 'error', etc. */
  action: varchar("action", { length: 100 }).notNull(),
  /** Status: 'success', 'error', 'pending' */
  status: varchar("status", { length: 50 }).notNull(),
  /** Facebook sender ID if applicable */
  senderId: varchar("senderId", { length: 255 }),
  /** Detailed information about the activity */
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type BotActivity = typeof botActivity.$inferSelect;
export type InsertBotActivity = typeof botActivity.$inferInsert;