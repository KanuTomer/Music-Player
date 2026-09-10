export type DataBackend = "supabase" | "neon";

function resolveBackend(value: string | undefined, variableName: string): DataBackend {
  if (value == null || value === "") return "supabase";
  if (value === "supabase" || value === "neon") return value;
  throw new Error(`${variableName} must be either 'supabase' or 'neon'.`);
}

export function resolveDataBackend(value = process.env["DATA_BACKEND"]): DataBackend {
  return resolveBackend(value, "DATA_BACKEND");
}

export function resolveOperationalWriteBackend(
  value = process.env["OPERATIONAL_WRITE_BACKEND"],
): DataBackend {
  return resolveBackend(value, "OPERATIONAL_WRITE_BACKEND");
}

export async function selectRoomReadRepository<T>(
  supabaseRepository: T,
  loadNeonRepository: () => Promise<T>,
  value = process.env["DATA_BACKEND"],
): Promise<T> {
  return resolveDataBackend(value) === "neon" ? loadNeonRepository() : supabaseRepository;
}

export async function selectOperationalWriteRepository<T>(
  loadSupabaseRepository: () => Promise<T>,
  loadNeonRepository: () => Promise<T>,
  value = process.env["OPERATIONAL_WRITE_BACKEND"],
): Promise<T> {
  return resolveOperationalWriteBackend(value) === "neon"
    ? loadNeonRepository()
    : loadSupabaseRepository();
}
