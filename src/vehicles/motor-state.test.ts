import { PARKING_BOXES } from "@/lib/delivery-system";
import { describe, expect, it } from "vitest";
import {
  DISMOUNT_MAX_SPEED,
  MOUNT_DISTANCE,
  canDismount,
  canMount,
  checkParking,
  dismountPosition,
  distanceTo,
  isInRect,
} from "./motor-state";

const motorAt = (x: number, z: number, heading = 0, speed = 0) => ({ x, z, heading, speed });

describe("canDismount", () => {
  it("dibenarkan bila hampir berhenti, kedua-dua arah", () => {
    expect(canDismount(0)).toBe(true);
    expect(canDismount(DISMOUNT_MAX_SPEED - 0.01)).toBe(true);
    expect(canDismount(-(DISMOUNT_MAX_SPEED - 0.01))).toBe(true);
  });

  it("ditolak pada atau melebihi had", () => {
    expect(canDismount(DISMOUNT_MAX_SPEED)).toBe(false);
    expect(canDismount(-5)).toBe(false);
    expect(canDismount(20)).toBe(false);
  });
});

describe("canMount", () => {
  it("dalam jarak naik", () => {
    expect(canMount({ x: 0, z: MOUNT_DISTANCE }, motorAt(0, 0))).toBe(true);
  });

  it("luar jarak naik", () => {
    expect(canMount({ x: 0, z: MOUNT_DISTANCE + 0.01 }, motorAt(0, 0))).toBe(false);
  });
});

describe("dismountPosition", () => {
  it("di sebelah kanan motor, 1.5 unit, mengikut arah", () => {
    // heading 0 = facing +z; right-hand side is -x
    const a = dismountPosition(motorAt(10, 10, 0));
    expect(a.x).toBeCloseTo(8.5);
    expect(a.z).toBeCloseTo(10);
    // heading π/2 = facing +x; right-hand side is +z
    const b = dismountPosition(motorAt(10, 10, Math.PI / 2));
    expect(b.x).toBeCloseTo(10);
    expect(b.z).toBeCloseTo(11.5);
  });

  it("sentiasa 1.5 unit dari motor (pemain tidak dihantar ke titik tetap)", () => {
    for (const h of [0, 1, 2, 3, -2]) {
      const m = motorAt(-37, 64, h);
      expect(distanceTo(dismountPosition(m), m)).toBeCloseTo(1.5);
    }
  });
});

describe("isInRect", () => {
  const box = { x: 0, z: 0, halfX: 2.5, halfZ: 1.5 };
  it("termasuk tepi", () => {
    expect(isInRect({ x: 2.5, z: 1.5 }, box)).toBe(true);
    expect(isInRect({ x: -2.5, z: -1.5 }, box)).toBe(true);
  });
  it("luar sedikit", () => {
    expect(isInRect({ x: 2.51, z: 0 }, box)).toBe(false);
    expect(isInRect({ x: 0, z: -1.51 }, box)).toBe(false);
  });
});

describe("checkParking — kotak alamat sebenar", () => {
  const { zoneId, box } = PARKING_BOXES[0];

  it("setiap alamat penghantaran ada kotak parkir", () => {
    expect(PARKING_BOXES).toHaveLength(3);
  });

  it("dalam kotak → betul", () => {
    expect(checkParking(box, PARKING_BOXES)).toEqual({ zoneId, proper: true });
  });

  it("dekat alamat tetapi luar kotak → tidak betul", () => {
    expect(checkParking({ x: box.x + 6, z: box.z }, PARKING_BOXES)).toEqual({ zoneId, proper: false });
  });

  it("jauh dari semua alamat → tidak dikira", () => {
    expect(checkParking({ x: 2, z: 2 }, PARKING_BOXES)).toEqual({ zoneId: null, proper: true });
  });
});
