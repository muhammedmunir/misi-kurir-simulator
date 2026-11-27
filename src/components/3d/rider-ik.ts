import { MathUtils, type Object3D, Quaternion, Vector3 } from "three";

export const RIDER_STEER_ANGLE = 0.22;
export const RIDER_STEER_PIVOT_Z = 0.42;
const Y_AXIS = new Vector3(0, 1, 0);

export function riderTargets(steer: number) {
  const angle = -MathUtils.clamp(steer, -1, 1) * RIDER_STEER_ANGLE;
  const grip = (side: number) => {
    const hand = new Vector3(side * 0.29, 1.07, 0.31 - RIDER_STEER_PIVOT_Z).applyAxisAngle(Y_AXIS, angle);
    hand.z += RIDER_STEER_PIVOT_Z;
    return hand;
  };
  return {
    leftHand: grip(1),
    rightHand: grip(-1),
    leftFoot: new Vector3(0.14, 0.32, 0.015),
    rightFoot: new Vector3(-0.14, 0.32, 0.015),
  };
}

const EPSILON = 1e-8;
const start = new Vector3();
const joint = new Vector3();
const tip = new Vector3();
const axis = new Vector3();
const bend = new Vector3();
const aim = new Vector3();
const desiredJoint = new Vector3();
const desiredTip = new Vector3();
const worldRotation = new Quaternion();
const inverseParent = new Quaternion();

function aimBone(bone: Object3D, from: Vector3, to: Vector3): void {
  worldRotation.setFromUnitVectors(from.normalize(), to.normalize());
  if (bone.parent) {
    bone.parent.getWorldQuaternion(inverseParent).invert();
    bone.quaternion.premultiply(worldRotation.premultiply(inverseParent).multiply(inverseParent.invert()));
  } else {
    bone.quaternion.premultiply(worldRotation);
  }
  bone.updateWorldMatrix(false, true);
}

/** Selesaikan siku atau lutut dalam ruang dunia tanpa mengubah terjemahan tulang. */
export function solveTwoBoneIK(upper: Object3D, lower: Object3D, end: Object3D, target: Vector3, pole: Vector3): void {
  upper.getWorldPosition(start);
  lower.getWorldPosition(joint);
  end.getWorldPosition(tip);
  const upperLength = start.distanceTo(joint);
  const lowerLength = joint.distanceTo(tip);
  if (upperLength < EPSILON || lowerLength < EPSILON) return;

  axis.subVectors(target, start);
  const distance = axis.length();
  if (distance < EPSILON) axis.subVectors(joint, start);
  axis.normalize();
  const reach = MathUtils.clamp(
    distance,
    Math.max(EPSILON, Math.abs(upperLength - lowerLength)),
    upperLength + lowerLength,
  );
  bend.subVectors(pole, start).addScaledVector(axis, -bend.dot(axis));
  if (bend.lengthSq() < EPSILON) {
    bend.set(Math.abs(axis.x) < 0.9 ? 1 : 0, Math.abs(axis.x) < 0.9 ? 0 : 1, 0);
    bend.addScaledVector(axis, -bend.dot(axis));
  }
  bend.normalize();

  const along = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  desiredJoint.copy(axis).multiplyScalar(along).addScaledVector(bend, height);
  desiredTip.copy(start).addScaledVector(axis, reach);
  aimBone(upper, aim.subVectors(joint, start), desiredJoint);

  lower.getWorldPosition(joint);
  end.getWorldPosition(tip);
  aimBone(lower, aim.subVectors(tip, joint), desiredTip.sub(joint));
}
