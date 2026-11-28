/** Status "skuter sedang ditunggang", dikemas kini oleh PlayerController dan dibaca oleh ScooterGLB (lampu). */
let ridden = false;

export const isScooterRidden = () => ridden;
export function setScooterRidden(value: boolean) {
  ridden = value;
}
