import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client.server";
import { adminAuthIdentities, appAdmins, authSessions, authUsers } from "../src/db/schema";
import { getBetterAuth } from "../src/lib/better-auth.server";

if (!process.argv.includes("--execute"))
  throw new Error("Pass --execute to create the replacement administrator");
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
if (!outputPath?.endsWith(".local"))
  throw new Error("Pass an ignored .local path with --output for the credentials");
const email = `kanu-admin-${randomBytes(5).toString("hex")}@example.invalid`;
const password = randomBytes(18).toString("base64url");
const adminUserId = randomUUID();
const created = await getBetterAuth().api.signUpEmail({ body: { email, password, name: "Kanu" } });
try {
  await db.transaction(async (tx) => {
    await tx
      .update(authUsers)
      .set({ emailVerified: true })
      .where(eq(authUsers.id, created.user.id));
    await tx.delete(authSessions).where(eq(authSessions.userId, created.user.id));
    await tx.insert(appAdmins).values({ userId: adminUserId });
    await tx.insert(adminAuthIdentities).values({ authUserId: created.user.id, adminUserId });
  });
} catch (error) {
  await db
    .delete(authUsers)
    .where(eq(authUsers.id, created.user.id))
    .catch(() => undefined);
  throw error;
}
await Bun.write(outputPath, `EMAIL=${email}\nPASSWORD=${password}\n`);
console.info("Replacement administrator created in the requested ignored local credentials file.");
process.exit(0);
