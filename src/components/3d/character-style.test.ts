import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { layeredClip, retargetClips } from "./CharacterGLB";
import { RIG_BONES, characterUrl } from "./character-style";

const track = (bone: string) => new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, [0], [0, 0, 0, 1]);

describe("watak Mixamo", () => {
  it("memilih GLB asal bagi setiap watak", () => {
    expect(characterUrl("courier")).toBe("/models/mixamo/courier.glb");
    expect(characterUrl("receiverF")).toBe("/models/mixamo/receiver-f.glb");
    expect(characterUrl("receiverM")).toBe("/models/mixamo/receiver-m.glb");
  });

  it("memetakan peranan IK kepada nama tulang Mixamo tanpa awalan", () => {
    expect(RIG_BONES).toEqual({
      hips: "Hips",
      spine: "Spine",
      spine1: "Spine1",
      leftArm: "LeftArm",
      leftForeArm: "LeftForeArm",
      leftHand: "LeftHand",
      rightArm: "RightArm",
      rightForeArm: "RightForeArm",
      rightHand: "RightHand",
      leftUpLeg: "LeftUpLeg",
      leftLeg: "LeftLeg",
      leftFoot: "LeftFoot",
      rightUpLeg: "RightUpLeg",
      rightLeg: "RightLeg",
      rightFoot: "RightFoot",
    });
  });

  it("mengekalkan trek kaki ketika membawa dan membuang translasi pinggul penerima dengan awalan bernombor", () => {
    const hips = new THREE.VectorKeyframeTrack("mixamorig2:Hips.position", [0], [0, 1, 0]);
    const walk = new THREE.AnimationClip("walk", 1, [track("mixamorig2:LeftUpLeg"), track("mixamorig2:Spine"), hips]);
    const carry = new THREE.AnimationClip("carry", 1, [
      track("mixamorig2:RightUpLeg"),
      track("mixamorig2:LeftHandIndex1"),
    ]);
    expect(layeredClip("carryWalk", walk, carry).tracks.map((t) => t.name)).toEqual([
      "mixamorig2:LeftUpLeg.quaternion",
      "mixamorig2:Hips.position",
      "mixamorig2:LeftHandIndex1.quaternion",
    ]);
    expect(retargetClips([walk], false)[0].tracks.map((t) => t.name)).toEqual([
      "mixamorig2:LeftUpLeg.quaternion",
      "mixamorig2:Spine.quaternion",
    ]);
    expect(retargetClips([walk], true)[0].tracks).toContain(hips);
  });
});
