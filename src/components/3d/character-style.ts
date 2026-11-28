export const CHARACTER_URL = {
  courier: "/models/mixamo/courier.glb",
  receiverF: "/models/mixamo/receiver-f.glb",
  receiverM: "/models/mixamo/receiver-m.glb",
} as const;

export type CharacterKey = keyof typeof CHARACTER_URL;

export function characterUrl(model: CharacterKey): string {
  return CHARACTER_URL[model];
}

// Nama tulang Mixamo tanpa awalan mixamorig, mixamorig2, dan seterusnya.
export const RIG_BONES = {
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
};
