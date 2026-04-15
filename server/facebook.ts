import { eq } from "drizzle-orm";
import { conversations, botActivity } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Interface for conversation messages
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/**
 * Get or create a conversation for a Facebook user
 */
export async function getOrCreateConversation(
  senderId: string,
  senderName?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.senderId, senderId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new conversation
    const newConversation = {
      senderId,
      senderName: senderName || "Usuario",
      messages: "[]",
    };

    await db.insert(conversations).values(newConversation);

    const created = await db
      .select()
      .from(conversations)
      .where(eq(conversations.senderId, senderId))
      .limit(1);

    return created[0];
  } catch (error) {
    console.error("[Facebook] Error getting/creating conversation:", error);
    throw error;
  }
}

/**
 * Get conversation history for a user
 */
export async function getConversationHistory(
  senderId: string
): Promise<ConversationMessage[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const conv = await db
      .select()
      .from(conversations)
      .where(eq(conversations.senderId, senderId))
      .limit(1);

    if (conv.length === 0) {
      return [];
    }

    return JSON.parse(conv[0].messages || "[]");
  } catch (error) {
    console.error("[Facebook] Error getting conversation history:", error);
    return [];
  }
}

/**
 * Add a message to conversation history
 */
export async function addMessageToConversation(
  senderId: string,
  role: "user" | "assistant",
  content: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const conv = await getOrCreateConversation(senderId);

    const messages: ConversationMessage[] = JSON.parse(
      conv.messages || "[]"
    );
    messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Keep only last 20 messages to avoid token limit
    const trimmedMessages = messages.slice(-20);

    await db
      .update(conversations)
      .set({
        messages: JSON.stringify(trimmedMessages),
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.senderId, senderId));
  } catch (error) {
    console.error("[Facebook] Error adding message to conversation:", error);
    throw error;
  }
}

/**
 * Log bot activity
 */
export async function logBotActivity(
  action: string,
  status: "success" | "error" | "pending",
  senderId?: string,
  details?: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Facebook] Database not available for logging activity");
    return;
  }

  try {
    await db.insert(botActivity).values({
      action,
      status,
      senderId: senderId || null,
      details: details || null,
    });
  } catch (error) {
    console.error("[Facebook] Error logging bot activity:", error);
  }
}

/**
 * Get recent bot activity
 */
export async function getRecentBotActivity(limit: number = 50) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const activities = await db
      .select()
      .from(botActivity)
      .orderBy((t) => t.timestamp)
      .limit(limit);

    return activities;
  } catch (error) {
    console.error("[Facebook] Error getting bot activity:", error);
    return [];
  }
}

/**
 * Get all conversations
 */
export async function getAllConversations() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const convs = await db
      .select()
      .from(conversations)
      .orderBy((t) => t.lastMessageAt);

    return convs;
  } catch (error) {
    console.error("[Facebook] Error getting all conversations:", error);
    return [];
  }
}
