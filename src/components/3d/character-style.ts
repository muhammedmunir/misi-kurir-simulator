export const CHARACTER_URL = {
  courier: "/models/mixamo/courier.glb",
  receiverF: "/models/mixamo/receiver-f.glb",
  receiverM: "/models/mixamo/receiver-m.glb",
} as const;

export type CharacterKey = keyof typeof CHARACTER_URL;
type CharacterStyle = "asal" | "rata" | "quaternius";

const CHARACTER_STYLE: CharacterStyle = "asal";

export const CHARACTER_STYLE_URLS: Record<CharacterStyle, Record<CharacterKey, string>> = {
  asal: CHARACTER_URL,
  rata: {
    courier: "/models/mixamo/courier-rata.glb",
    receiverF: "/models/mixamo/receiver-f-rata.glb",
    receiverM: "/models/mixamo/receiver-m-rata.glb",
  },
  quaternius: {
    courier: "/models/quaternius/courier.glb",
    receiverF: "/models/quaternius/receiver-f.glb",
    receiverM: "/models/quaternius/receiver-m.glb",
  },
};

function activeStyle(): CharacterStyle {
  if (import.meta.env.DEV && typeof location !== "undefined") {
    const requested = new URLSearchParams(location.search).get("watak");
    if (requested === "asal" || requested === "rata" || requested === "quaternius") return requested;
  }
  return CHARACTER_STYLE;
}

const activeUrls = CHARACTER_STYLE_URLS[activeStyle()];
export function characterUrl(model: CharacterKey): string {
  return activeUrls[model];
}

// Untuk Mixamo, nama di bawah tidak termasuk awalan mixamorig, mixamorig2, dan seterusnya.
const mixamo = {
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

export const RIG_BONES = {
  mixamo,
  quaternius: {
    hips: "pelvis",
    spine: "spine_01",
    spine1: "spine_02",
    leftArm: "upperarm_l",
    leftForeArm: "lowerarm_l",
    leftHand: "hand_l",
    rightArm: "upperarm_r",
    rightForeArm: "lowerarm_r",
    rightHand: "hand_r",
    leftUpLeg: "thigh_l",
    leftLeg: "calf_l",
    leftFoot: "foot_l",
    rightUpLeg: "thigh_r",
    rightLeg: "calf_r",
    rightFoot: "foot_r",
  } satisfies Record<keyof typeof mixamo, string>,
};
