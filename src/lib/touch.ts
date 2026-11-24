// Shared touch input state for cross-component communication
// This avoids prop-drilling and works across the React + R3F boundary.
import type { TouchInput as TouchInputType } from "@/components/TouchJoystick";

export const touchInput: TouchInputType = {
  joystick: { forward: 0, right: 0, active: false },
  brake: false,
  horn: false,
  action: false,
  cameraAngle: 0,
};

// Call this in a useEffect to bind the joystick callback
export function bindTouchInput(onInput: (input: TouchInputType) => void) {
  // Override onInput to also update the shared state
  return (input: TouchInputType) => {
    touchInput.joystick.forward = input.joystick.forward;
    touchInput.joystick.right = input.joystick.right;
    touchInput.joystick.active = input.joystick.active;
    touchInput.brake = input.brake;
    touchInput.horn = input.horn;
    touchInput.action = input.action;
    touchInput.cameraAngle = input.cameraAngle;
    onInput(input);
  };
}
