import { eq } from "drizzle-orm";
import { appAdmins } from "@/db/schema";

type AuthorizationDatabase = {
  select: (fields: { userId: typeof appAdmins.userId }) => {
    from: (table: typeof appAdmins) => {
      where: (condition: ReturnType<typeof eq>) => {
        limit: (count: number) => Promise<Array<{ userId: string }>>;
      };
    };
  };
};

export function createNeonAdminAuthorizationRepository(database: AuthorizationDatabase) {
  return {
    async isAdmin(userId: string): Promise<boolean> {
      const rows = await database
        .select({ userId: appAdmins.userId })
        .from(appAdmins)
        .where(eq(appAdmins.userId, userId))
        .limit(1);
      return rows.length === 1;
    },
  };
}

export const neonAdminAuthorizationRepository = {
  async isAdmin(userId: string): Promise<boolean> {
    const { db } = await import("@/db/client.server");
    const rows = await db
      .select({ userId: appAdmins.userId })
      .from(appAdmins)
      .where(eq(appAdmins.userId, userId))
      .limit(1);
    return rows.length === 1;
  },
};
