import { expect, it } from "vitest";
import { stepMotor } from "./motor-physics";

const moving = { speed: 14, heading: 0, steer: 1, lean: 0 };

it("mengurangkan kadar belok kepada 85% pada kelajuan yang sama", () => {
  const input = { throttle: 0, steer: 1, handBrake: false };
  const dry = stepMotor(moving, input, 0.1);
  const wet = stepMotor(moving, input, 0.1, true);
  expect(wet.speed).toBe(dry.speed);
  expect(wet.heading).toBeCloseTo(dry.heading * 0.85);
});

it.each([
  { throttle: -1, steer: 0, handBrake: false },
  { throttle: 0, steer: 0, handBrake: true },
])("mengurangkan nyahpecutan brek kepada 80% semasa hujan (%j)", (input) => {
  const dry = stepMotor(moving, input, 0.1);
  const wet = stepMotor(moving, input, 0.1, true);
  expect(moving.speed - wet.speed).toBeCloseTo((moving.speed - dry.speed) * 0.8);
});
