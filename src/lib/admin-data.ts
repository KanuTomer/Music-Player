export type AdminDataBackend = "supabase" | "neon";

export function resolveAdminDataBackend(
  value = process.env["ADMIN_DATA_BACKEND"],
): AdminDataBackend {
  if (value == null || value === "" || value === "supabase") return "supabase";
  if (value === "neon") return "neon";
  throw new Error("ADMIN_DATA_BACKEND must be either 'supabase' or 'neon'.");
}

export function isNeonAdminData(value = process.env["ADMIN_DATA_BACKEND"]): boolean {
  return resolveAdminDataBackend(value) === "neon";
}
