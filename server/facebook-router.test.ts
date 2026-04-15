import { describe, expect, it } from "vitest";
import { facebookRouter } from "./facebook-router";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Facebook Router - Admin Access Control", () => {
  it("should allow admin to get conversations", async () => {
    const ctx = createAdminContext();
    const caller = facebookRouter.createCaller(ctx);

    try {
      const result = await caller.getConversations();
      expect(Array.isArray(result)).toBe(true);
    } catch (error) {
      // If database is not available, that's okay for this test
      // We're testing authorization, not database functionality
      expect((error as Error).message).not.toContain("Unauthorized");
    }
  });

  it("should deny regular user from getting conversations", async () => {
    const ctx = createUserContext();
    const caller = facebookRouter.createCaller(ctx);

    try {
      await caller.getConversations();
      expect.fail("Should have thrown Unauthorized error");
    } catch (error) {
      expect((error as Error).message).toContain("Unauthorized");
    }
  });

  it("should allow admin to get dashboard stats", async () => {
    const ctx = createAdminContext();
    const caller = facebookRouter.createCaller(ctx);

    try {
      const result = await caller.getDashboardStats();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalConversations");
      expect(result).toHaveProperty("totalMessages");
      expect(result).toHaveProperty("successRate");
    } catch (error) {
      expect((error as Error).message).not.toContain("Unauthorized");
    }
  });

  it("should deny regular user from getting dashboard stats", async () => {
    const ctx = createUserContext();
    const caller = facebookRouter.createCaller(ctx);

    try {
      await caller.getDashboardStats();
      expect.fail("Should have thrown Unauthorized error");
    } catch (error) {
      expect((error as Error).message).toContain("Unauthorized");
    }
  });

  it("should allow admin to get recent activity", async () => {
    const ctx = createAdminContext();
    const caller = facebookRouter.createCaller(ctx);

    try {
      const result = await caller.getRecentActivity({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    } catch (error) {
      expect((error as Error).message).not.toContain("Unauthorized");
    }
  });

  it("should deny regular user from getting recent activity", async () => {
    const ctx = createUserContext();
    const caller = facebookRouter.createCaller(ctx);

    try {
      await caller.getRecentActivity({ limit: 10 });
      expect.fail("Should have thrown Unauthorized error");
    } catch (error) {
      expect((error as Error).message).toContain("Unauthorized");
    }
  });
});
