import { describe, expect, it } from "vitest";
import { advanceTime, dayPhase, isRaining } from "./daytime";

describe("dayPhase", () => {
  it("menukar warna dan intensiti dari subuh ke tengah hari dan malam", () => {
    const dawn = dayPhase(6 * 60);
    const noon = dayPhase(12 * 60);
    const night = dayPhase(20 * 60);
    expect(dawn.sun).toBeGreaterThan(night.sun);
    expect(noon.sun).toBe(1);
    expect(noon.sun).toBeGreaterThan(dawn.sun);
    expect(night.sun).toBe(0);
    for (const key of ["sky", "horizon"] as const) {
      expect(new Set([dawn[key], noon[key], night[key]]).size).toBe(3);
    }
  });

  it.each([
    [0, true],
    [419, true],
    [420, false],
    [1139, false],
    [1140, true],
    [1440, true],
  ])("menentukan lampu jalan pada minit %i", (minutes, expected) => {
    expect(dayPhase(minutes).lampsOn).toBe(expected);
  });
});

it("menggerakkan jam satu minit permainan setiap saat dan mengulang selepas tengah malam", () => {
  expect(advanceTime(480, 30)).toBe(510);
  expect(advanceTime(1439.5, 1)).toBe(0.5);
  expect(advanceTime(480, 24 * 60)).toBe(480);
});

it("mengikut pilihan pemain dan menukar cuaca mengikut jam dalam mod Auto", () => {
  expect(isRaining("on", 480)).toBe(true);
  expect(isRaining("off", 975)).toBe(false);
  expect(isRaining("auto", 480)).toBe(false);
  expect(isRaining("auto", 975)).toBe(true);
  expect(isRaining("auto", 1040)).toBe(false);
});
