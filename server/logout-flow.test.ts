import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Logout Flow", () => {
  describe("Server-side logout", () => {
    it("clears session cookie on logout", async () => {
      const { ctx, clearedCookies } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(clearedCookies).toHaveLength(1);
      expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    });

    it("sets maxAge to -1 to expire the cookie immediately", async () => {
      const { ctx, clearedCookies } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.auth.logout();

      expect(clearedCookies[0]?.options.maxAge).toBe(-1);
    });

    it("sets httpOnly and secure flags on cleared cookie", async () => {
      const { ctx, clearedCookies } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.auth.logout();

      expect(clearedCookies[0]?.options.httpOnly).toBe(true);
      expect(clearedCookies[0]?.options.secure).toBe(true);
    });

    it("logout works even for unauthenticated users (publicProcedure)", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      // Should not throw - logout is a publicProcedure
      const result = await caller.auth.logout();
      expect(result).toEqual({ success: true });
    });
  });

  describe("Protected routes return UNAUTHORIZED for unauthenticated users", () => {
    it("subscription.status requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.subscription.status()).rejects.toThrow();
    });

    it("account.credits requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.account.credits()).rejects.toThrow();
    });

    it("account.usage requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.account.usage()).rejects.toThrow();
    });

    it("chat.list requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.chat.list()).rejects.toThrow();
    });

    it("chat.create requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.chat.create()).rejects.toThrow();
    });
  });

  describe("auth.me returns null for unauthenticated users", () => {
    it("returns null when no user in context", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();
      expect(result).toBeNull();
    });

    it("returns user data when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.name).toBe("Sample User");
      expect(result?.email).toBe("sample@example.com");
    });
  });
});

describe("LogoutSuccess page requirements", () => {
  it("should not contain 'Acessar Terminal' text", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/LogoutSuccess.tsx",
      "utf-8"
    );
    expect(content).not.toContain("Acessar Terminal");
  });

  it("should contain 'Entrar novamente' button", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/LogoutSuccess.tsx",
      "utf-8"
    );
    expect(content).toContain("Entrar novamente");
  });

  it("should contain 'Voltar para o site' button", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/LogoutSuccess.tsx",
      "utf-8"
    );
    expect(content).toContain("Voltar para o site");
  });

  it("should contain security confirmation message", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/LogoutSuccess.tsx",
      "utf-8"
    );
    expect(content).toContain("Você saiu da sua conta com segurança");
  });

  it("should contain login redirect via getLoginUrl", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/LogoutSuccess.tsx",
      "utf-8"
    );
    expect(content).toContain("getLoginUrl");
  });

  it("should link back to home page", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/LogoutSuccess.tsx",
      "utf-8"
    );
    expect(content).toContain('window.location.href = "/"');
  });
});

describe("ChatPage unauthenticated state", () => {
  it("should not contain 'Acessar Terminal' text", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/ChatPage.tsx",
      "utf-8"
    );
    expect(content).not.toContain("Acessar Terminal");
  });

  it("should show 'Entre para acessar o chat' for unauthenticated users", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/ChatPage.tsx",
      "utf-8"
    );
    expect(content).toContain("Entre para acessar o chat");
  });

  it("should have 'Entrar' button instead of 'Acessar Terminal'", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/pages/ChatPage.tsx",
      "utf-8"
    );
    // Check for the Entrar button in the unauthenticated section
    expect(content).toContain("Entrar");
    expect(content).toContain("LogIn");
  });
});

describe("useAuth hook logout redirect", () => {
  it("should redirect to /logout-success after logout", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/_core/hooks/useAuth.ts",
      "utf-8"
    );
    expect(content).toContain("/logout-success");
  });

  it("should not redirect to home page directly after logout", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/_core/hooks/useAuth.ts",
      "utf-8"
    );
    // The logout function should redirect to /logout-success, not /
    const logoutSection = content.substring(
      content.indexOf("const logout = useCallback"),
      content.indexOf("}, [logoutMutation")
    );
    expect(logoutSection).toContain("/logout-success");
    expect(logoutSection).not.toContain('href = "/"');
  });
});

describe("App.tsx routing", () => {
  it("should have /logout-success route", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/App.tsx",
      "utf-8"
    );
    expect(content).toContain("/logout-success");
    expect(content).toContain("LogoutSuccess");
  });
});
