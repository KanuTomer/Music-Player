import { and, eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { adminAuthIdentities, appAdmins } from "@/db/schema";
import { getBetterAuth } from "./better-auth.server";
import { getRequestHeader } from "./request-context.server";
import type { AdminOnboardingStatus } from "./admin-authorization";
import { classifyBetterAuthAdminSession } from "./better-auth-authorization";

export type VerifiedAdminIdentity = {
  userId: string;
  authUserId: string;
  aal: "aal2";
  email?: string;
};

export async function getRequestAdminAuthorization(): Promise<{
  identity: VerifiedAdminIdentity | null;
  status: AdminOnboardingStatus;
}> {
  const headers = new Headers();
  const cookie = getRequestHeader("cookie");
  const authorization = getRequestHeader("authorization");
  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);
  const session = await getBetterAuth().api.getSession({ headers });
  if (!session) return { identity: null, status: "not_authorized" };

  const mappings = await db
    .select({ adminUserId: adminAuthIdentities.adminUserId })
    .from(adminAuthIdentities)
    .innerJoin(appAdmins, eq(appAdmins.userId, adminAuthIdentities.adminUserId))
    .where(
      and(
        eq(adminAuthIdentities.authUserId, session.user.id),
        eq(appAdmins.userId, adminAuthIdentities.adminUserId),
      ),
    )
    .limit(1);
  const authUser = session.user as typeof session.user & { twoFactorEnabled?: boolean };
  const status = classifyBetterAuthAdminSession({
    hasSession: true,
    allowlisted: Boolean(mappings[0]),
    twoFactorEnabled: Boolean(authUser.twoFactorEnabled),
    sessionCreatedAt: new Date(session.session.createdAt),
    userUpdatedAt: new Date(authUser.updatedAt),
  });
  if (status !== "ready" || !mappings[0]) return { identity: null, status };
  return {
    status: "ready",
    identity: {
      userId: mappings[0].adminUserId,
      authUserId: session.user.id,
      aal: "aal2",
      ...(session.user.email ? { email: session.user.email } : {}),
    },
  };
}

export async function requireRequestAdmin(): Promise<VerifiedAdminIdentity> {
  const authorization = await getRequestAdminAuthorization();
  if (authorization.status === "not_authorized") {
    throw new Error("Administrator access is required");
  }
  if (authorization.status !== "ready" || !authorization.identity) {
    throw new Error("Administrator MFA verification is required");
  }
  return authorization.identity;
}
