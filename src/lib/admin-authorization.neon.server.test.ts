import { describe, expect, test } from "bun:test";
import { createNeonAdminAuthorizationRepository } from "./admin-authorization.neon.server";

const USER_ID = "f6adb0b3-5e24-4799-b008-2ff909e97e6e";

function databaseWithRows(rows: Array<{ userId: string }>) {
  let selectedLimit = 0;
  const database = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit(count: number) {
                  selectedLimit = count;
                  return rows;
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Parameters<typeof createNeonAdminAuthorizationRepository>[0];
  return { database, selectedLimit: () => selectedLimit };
}

describe("Neon administrator allowlist", () => {
  test("accepts one matching external Supabase UUID", async () => {
    const fixture = databaseWithRows([{ userId: USER_ID }]);
    const repository = createNeonAdminAuthorizationRepository(fixture.database);
    expect(await repository.isAdmin(USER_ID)).toBe(true);
    expect(fixture.selectedLimit()).toBe(1);
  });

  test("denies a UUID absent from the allowlist", async () => {
    const fixture = databaseWithRows([]);
    const repository = createNeonAdminAuthorizationRepository(fixture.database);
    expect(await repository.isAdmin(USER_ID)).toBe(false);
  });
});
