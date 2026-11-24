import { canTransition } from "@/delivery/packet";
import {
  calcVolume,
  clamp,
  degToRad,
  formatRinggit,
  formatTime,
  generateTrackingNumber,
  lerp,
  shuffleArray,
} from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("formatRinggit", () => {
  it("format RM biasa", () => {
    expect(formatRinggit(1250)).toBe("RM1,250.00");
  });
  it("format RM besar", () => {
    expect(formatRinggit(5000000)).toBe("RM5,000,000.00");
  });
  it("format RM nol", () => {
    expect(formatRinggit(0)).toBe("RM0.00");
  });
  it("format RM kecil", () => {
    expect(formatRinggit(15000)).toBe("RM15,000.00");
  });
  it("format RM dengan desimal", () => {
    expect(formatRinggit(350.5)).toBe("RM350.50");
  });
});

describe("formatTime", () => {
  it("format kurang dari 60 saat", () => {
    expect(formatTime(30000)).toBe("30s");
  });
  it("format kurang dari 1 jam", () => {
    expect(formatTime(90000)).toBe("1m 30s");
  });
  it("format lebih dari 1 jam", () => {
    expect(formatTime(7200000)).toBe("2j 0m");
  });
  it("format 0", () => {
    expect(formatTime(0)).toBe("0s");
  });
});

describe("clamp", () => {
  it("kecil dari min", () => {
    expect(clamp(0, 5, 10)).toBe(5);
  });
  it("dalam range", () => {
    expect(clamp(7, 5, 10)).toBe(7);
  });
  it("lebih besar dari max", () => {
    expect(clamp(15, 5, 10)).toBe(10);
  });
});

describe("lerp", () => {
  it("t = 0", () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });
  it("t = 1", () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });
  it("t = 0.5", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe("calcVolume", () => {
  it("kotak 10x10x10 cm", () => {
    expect(calcVolume(10, 10, 10)).toBe(1);
  });
  it("kotak 1x1x1 cm", () => {
    expect(calcVolume(1, 1, 1)).toBe(0.001);
  });
  it("kotak besar", () => {
    expect(calcVolume(50, 40, 30)).toBe(60);
  });
});

describe("generateTrackingNumber", () => {
  it("generate format betul", () => {
    const num = generateTrackingNumber("MSK");
    expect(num).toMatch(/^MSK-[A-Z0-9]+-[A-Z0-9]+$/);
  });
  it("berbeza setiap panggilan", () => {
    const a = generateTrackingNumber();
    const b = generateTrackingNumber();
    expect(a).not.toBe(b);
  });
});

describe("degToRad", () => {
  it("90 degree = PI/2", () => {
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
  });
  it("180 degree = PI", () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });
  it("0 degree = 0", () => {
    expect(degToRad(0)).toBe(0);
  });
});

describe("shuffleArray", () => {
  it("array kosong", () => {
    expect(shuffleArray([])).toEqual([]);
  });
  it("satu item", () => {
    expect(shuffleArray([1])).toEqual([1]);
  });
  it("berbagai item", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(5);
    expect(shuffled).not.toEqual([1, 2, 3, 4, 5]); // kemungkinan tinggi berbeza
  });
  it("tidak ubah array asal", () => {
    const arr = [1, 2, 3];
    shuffleArray(arr);
    expect(arr).toHaveLength(3);
  });
});

describe("canTransition", () => {
  it("incoming → received", () => {
    expect(canTransition("incoming", "received")).toBe(true);
  });
  it("received → sorting", () => {
    expect(canTransition("received", "sorting")).toBe(true);
  });
  it("sorting → delivered (invalid)", () => {
    expect(canTransition("sorting", "delivered")).toBe(false);
  });
  it("failed → out_for_delivery (retry)", () => {
    expect(canTransition("failed", "out_for_delivery")).toBe(true);
  });
  it("delivered → returned", () => {
    expect(canTransition("delivered", "returned")).toBe(true);
  });
  it("delivered → incoming (invalid)", () => {
    expect(canTransition("delivered", "incoming")).toBe(false);
  });
  it("cancelled → returned (invalid)", () => {
    expect(canTransition("cancelled", "returned")).toBe(false);
  });
});
