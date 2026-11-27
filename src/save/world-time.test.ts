import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { afterEach, beforeEach, expect, it } from "vitest";
import type { SaveBackend } from "./backend";
import { loadSaved, saveNow } from "./save-game";
import { buildSave, validateSave } from "./save-schema";

beforeEach(() => {
  useGameStateStore.getState().createNewGame("Kurir Ujian");
  useDeliveryStore.getState().reset();
});
afterEach(() => useGameStateStore.getState().resetGame());

function memorySave(initial: unknown = null): SaveBackend {
  let data: unknown = initial;
  return {
    async read() {
      return data;
    },
    async write(value) {
      data = structuredClone(value);
    },
    async clear() {
      data = null;
    },
  };
}

it("menyimpan dan memulihkan minit permainan dalam save v1", async () => {
  const backend = memorySave();
  useGameStateStore.setState({ worldMinutes: 1170.5 });
  expect(await saveNow(backend, 123)).toBe(true);
  expect(await backend.read()).toMatchObject({ version: 1, worldMinutes: 1170.5 });
  useGameStateStore.setState({ worldMinutes: 480 });
  expect(await loadSaved(backend)).toEqual({ ok: true });
  expect(useGameStateStore.getState().worldMinutes).toBe(1170.5);
});

it("memulihkan save lama tanpa jam atau pilihan hujan", async () => {
  const oldSave = buildSave(123);
  const raw = { ...oldSave, worldMinutes: undefined, settings: { ...oldSave.settings, rainMode: undefined } };
  useGameStateStore.setState({ worldMinutes: 1170 });
  expect(await loadSaved(memorySave(raw))).toEqual({ ok: true });
  expect(useGameStateStore.getState()).toMatchObject({ worldMinutes: 480, settings: { rainMode: "auto" } });
});

it("mengekalkan pilihan Hujan dari menu apabila memulakan permainan atau memuat simpanan", async () => {
  const previous = memorySave(buildSave(123));
  useGameStateStore.getState().setRainMode("on");
  useGameStateStore.getState().createNewGame("Kurir Kedua");
  expect(useGameStateStore.getState().settings.rainMode).toBe("on");
  expect(await loadSaved(previous)).toEqual({ ok: true });
  expect(useGameStateStore.getState().settings.rainMode).toBe("on");
});

it.each([-1, 1440, Number.NaN, "480"])("menolak minit permainan yang tidak sah: %s", (worldMinutes) => {
  expect(validateSave({ ...buildSave(123), worldMinutes })).toMatchObject({ ok: false });
});
