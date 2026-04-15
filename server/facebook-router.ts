import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllConversations,
  getRecentBotActivity,
  getConversationHistory,
} from "./facebook";

export const facebookRouter = router({
  /**
   * Get all conversations for the admin dashboard
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    // Only allow admin access
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const conversations = await getAllConversations();
    return conversations.map((conv) => ({
      id: conv.id,
      senderId: conv.senderId,
      senderName: conv.senderName,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      messageCount: JSON.parse(conv.messages || "[]").length,
    }));
  }),

  /**
   * Get conversation details including message history
   */
  getConversationDetails: protectedProcedure
    .input(z.object({ senderId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Only allow admin access
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const history = await getConversationHistory(input.senderId);
      return {
        senderId: input.senderId,
        messages: history,
      };
    }),

  /**
   * Get recent bot activity for monitoring
   */
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      // Only allow admin access
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const activities = await getRecentBotActivity(input?.limit || 50);
      return activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        status: activity.status,
        senderId: activity.senderId,
        details: activity.details,
        timestamp: activity.timestamp,
      }));
    }),

  /**
   * Get dashboard statistics
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    // Only allow admin access
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const conversations = await getAllConversations();
    const activities = await getRecentBotActivity(100);

    const successCount = activities.filter(
      (a) => a.status === "success"
    ).length;
    const errorCount = activities.filter((a) => a.status === "error").length;

    return {
      totalConversations: conversations.length,
      totalMessages: conversations.reduce(
        (sum, conv) => sum + JSON.parse(conv.messages || "[]").length,
        0
      ),
      recentActivityCount: activities.length,
      successfulResponses: successCount,
      failedResponses: errorCount,
      successRate:
        activities.length > 0
          ? ((successCount / activities.length) * 100).toFixed(2)
          : "0",
    };
  }),
});
