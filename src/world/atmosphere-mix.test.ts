import { describe, expect, it } from "vitest";
import { mixAtmosphere } from "./atmosphere-mix";
import { dayPhase } from "./daytime";

const channel = (color: string, offset: number) => Number.parseInt(color.slice(offset, offset + 2), 16);

describe("campuran suasana", () => {
  it("mengekalkan warna siang cerah dan mematikan lampu jalan", () => {
    const noon = 12 * 60;
    const clear = mixAtmosphere(noon, false);
    expect(clear).toMatchObject({ ...dayPhase(noon), fogNear: 90, fogFar: 320, sunIntensity: 2.4 });
    expect(clear.lampsOn).toBe(false);
  });

  it.each([19 * 60, 6 * 60 + 50])("memanaskan ufuk dan langit pada minit %i", (minutes) => {
    const warm = mixAtmosphere(minutes, false);
    expect(channel(warm.horizon, 1)).toBeGreaterThan(channel(warm.horizon, 5));
    expect(channel(warm.sky, 1)).toBeGreaterThan(channel(dayPhase(minutes).sky, 1));
  });

  it("mengekalkan malam gelap dengan lampu jalan menyala", () => {
    const night = mixAtmosphere(21 * 60 + 30, false);
    expect(night).toMatchObject({ lampsOn: true, sunIntensity: 0, sky: "#101e38", horizon: "#34465e" });
  });

  it("merapatkan kabus dan meredupkan cahaya ketika hujan siang", () => {
    const noon = 12 * 60;
    const dry = mixAtmosphere(noon, false);
    const wet = mixAtmosphere(noon, true);
    expect(wet).toMatchObject({ fogNear: 45, fogFar: 200, lampsOn: false });
    expect(channel(wet.horizon, 1)).toBeLessThan(channel(dry.horizon, 1));
    expect(channel(wet.sky, 5)).toBeLessThan(channel(dry.sky, 5));
    expect(wet.sunIntensity).toBeLessThan(dry.sunIntensity);
    expect(wet.hemisphereIntensity).toBeLessThan(dry.hemisphereIntensity);
    expect(wet.hemisphereColor).not.toBe(dry.hemisphereColor);
  });

  it("merapatkan kabus malam tanpa mencerahkan langit seperti siang", () => {
    const wetNight = mixAtmosphere(21 * 60 + 30, true);
    const wetDay = mixAtmosphere(12 * 60, true);
    expect(wetNight).toMatchObject({ fogNear: 45, fogFar: 200, lampsOn: true, sunIntensity: 0 });
    expect(wetNight.sky).not.toBe(mixAtmosphere(21 * 60 + 30, false).sky);
    expect(channel(wetNight.sky, 1)).toBeLessThan(channel(wetDay.sky, 1));
  });
});
