import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { layeredClip, retargetClips } from "./CharacterGLB";
import { CHARACTER_STYLE_URLS, CHARACTER_URL, RIG_BONES } from "./character-style";

const track = (bone: string) => new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, [0], [0, 0, 0, 1]);

describe("gaya watak", () => {
  it("mengekalkan URL Mixamo dan menyediakan tiga watak bagi setiap gaya", () => {
    expect(CHARACTER_STYLE_URLS.asal).toBe(CHARACTER_URL);
    expect(Object.keys(CHARACTER_STYLE_URLS).sort()).toEqual(["asal", "quaternius", "rata"]);
    for (const urls of Object.values(CHARACTER_STYLE_URLS)) {
      expect(Object.keys(urls).sort()).toEqual(["courier", "receiverF", "receiverM"]);
      expect(new Set(Object.values(urls)).size).toBe(3);
    }
  });

  it("menyediakan peranan IK yang lengkap bagi kedua-dua rangka", () => {
    const roles = [
      "hips",
      "spine",
      "spine1",
      "leftArm",
      "leftForeArm",
      "leftHand",
      "rightArm",
      "rightForeArm",
      "rightHand",
      "leftUpLeg",
      "leftLeg",
      "leftFoot",
      "rightUpLeg",
      "rightLeg",
      "rightFoot",
    ];
    for (const rig of [RIG_BONES.mixamo, RIG_BONES.quaternius]) {
      for (const role of roles) expect(rig).toHaveProperty(role, expect.any(String));
      expect(new Set(Object.values(rig)).size).toBe(roles.length);
    }
  });

  it("mengabaikan parameter URL dalam produksi tetapi menerimanya dalam dev", async () => {
    try {
      vi.stubGlobal("location", { search: "?watak=quaternius" });
      vi.stubEnv("DEV", false);
      vi.resetModules();
      const prod = await import("./character-style");
      expect(prod.characterUrl("courier")).toBe(CHARACTER_URL.courier);
      vi.stubEnv("DEV", true);
      vi.resetModules();
      const dev = await import("./character-style");
      expect(dev.characterUrl("courier")).toBe(CHARACTER_STYLE_URLS.quaternius.courier);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("mengekalkan kaki ketika membawa dan membuang translasi pinggul penerima Quaternius", () => {
    const pelvis = new THREE.VectorKeyframeTrack("pelvis.position", [0], [0, 0, 0]);
    const walk = new THREE.AnimationClip("walk", 1, [track("thigh_l"), track("spine_01"), pelvis]);
    const carry = new THREE.AnimationClip("carry", 1, [track("thigh_r"), track("index_02_l"), track("upperarm_r")]);
    expect(layeredClip("carryWalk", walk, carry).tracks.map((t) => t.name)).toEqual([
      "thigh_l.quaternion",
      "pelvis.position",
      "index_02_l.quaternion",
      "upperarm_r.quaternion",
    ]);
    expect(retargetClips([walk], false)[0].tracks).not.toContain(pelvis);
    expect(retargetClips([walk], true)[0].tracks).toContain(pelvis);
  });
});
