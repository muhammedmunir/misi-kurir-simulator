import { SAVE_VERSION } from "@/save/save-schema";

export function migrate(raw: unknown): { ok: true; data: unknown } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Format save tidak sah" };
  }

  const obj = raw as Record<string, unknown>;

  // Old format with "slots" (SaveData)
  if ("slots" in obj) {
    return { ok: false, error: "Format save lama tidak disokong" };
  }

  // Check version
  if (typeof obj.version !== "number") {
    return { ok: false, error: "Format save lama tidak disokong" };
  }

  if (obj.version > SAVE_VERSION) {
    return { ok: false, error: "Simpanan lebih baharu dari versi permainan ini" };
  }

  if (obj.version === SAVE_VERSION) {
    return { ok: true, data: raw };
  }

  // Future migrations will go here
  return { ok: false, error: "Versi save tidak dikenali" };
}
