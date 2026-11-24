// Shared touch input state across the React DOM overlay and the R3F frame loop.

export interface JoystickInput {
  forward: number;
  right: number;
  active: boolean;
}

export interface TouchInput {
  joystick: JoystickInput;
  brake: boolean;
}

export const touchInput: TouchInput = {
  joystick: { forward: 0, right: 0, active: false },
  brake: false,
};

// One tap = one interaction. The flag is cleared by whoever consumes it,
// so holding the button never repeats the action.
let actionRequested = false;

export function requestAction(): void {
  actionRequested = true;
}

export function consumeAction(): boolean {
  const requested = actionRequested;
  actionRequested = false;
  return requested;
}
