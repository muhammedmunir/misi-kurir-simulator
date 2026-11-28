// Guna: node tools/convert/banding.mjs [alamat Vite]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:5190";
const dir = ".playwright-mcp/plan-022";
const styles = ["asal", "rata", "quaternius"];
const views = ["jalan", "serah", "tunggang", "luas"];
const width = 960;
const height = 540;
const street = { x: 50, z: 38 };
const address = "zone-delivery-1";
const browser = await chromium.launch({ channel: "chrome" });
mkdirSync(dir, { recursive: true });

async function setup(style, fixed) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/PropertyBinding|Error.*GLTF/i.test(message.text())) errors.push(message.text());
  });
  await page.addInitScript(() => {
    // Asingkan benih trafik daripada Math.random yang digunakan pemuat aset.
    const random = Math.random;
    let seed = 2201;
    Math.random = () =>
      new Error().stack?.includes("generateNPCTraffic")
        ? (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296
        : random();
  });
  await page.goto(new URL(`/?watak=${style}`, base).href);
  await page.evaluate(async ({ fixed, address }) => {
    // Guna URL sebenar Vite (termasuk query HMR) supaya store bukan salinan kedua.
    const appModule = (path) => {
      const url = performance.getEntriesByType("resource").find(({ name }) => new URL(name).pathname === path)?.name;
      if (!url) throw new Error(`Modul aplikasi tidak dimuat: ${path}`);
      return import(url);
    };
    const fiber = await appModule("/node_modules/.vite/deps/@react-three_fiber.js");
    const controller = await appModule("/src/components/3d/PlayerController.tsx");
    const { useGameStateStore: game } = await appModule("/src/store/gamestate.ts");
    const { useDeliveryStore: delivery } = await appModule("/src/store/delivery.ts");
    const { RIG_BONES: rigs } = await appModule("/src/components/3d/character-style.ts");
    const { riderTargets } = await appModule("/src/components/3d/rider-ik.ts");
    const root = () => [...fiber._roots.values()].find(({ fiber }) => fiber);
    const noon = 12 * 60;
    game.getState().setRainMode("off");
    game.setState({ worldMinutes: noon });
    game.subscribe(({ worldMinutes }) => {
      if (worldMinutes !== noon) game.setState({ worldMinutes: noon });
    });
    const { deps, zones } = delivery.getState();
    const destinations = zones.filter(({ type }) => type === "delivery");
    const index = destinations.findIndex(({ id }) => id === address);
    if (index < 0) throw new Error(`Alamat tidak wujud: ${address}`);
    const rolls = [(index + 0.5) / destinations.length, 0.2, 0.2, 0.2, 0.8];
    let draw = 0;
    delivery.setState({ deps: { ...deps, rng: () => rolls[draw++ % rolls.length] } });

    let frame = 0;
    if (fixed) {
      const unsubscribe = fiber.addEffect(() => {
        const state = root()?.store.getState();
        if (!state) return;
        state.setFrameloop("never");
        unsubscribe();
      });
    }
    function hasSkin(object) {
      let ready = false;
      object?.traverse((node) => { if (node.isSkinnedMesh) ready = true; });
      return ready;
    }
    window.capture = {
      ...controller, game, delivery, rigs, riderTargets, hasSkin,
      get: () => root()?.store.getState(),
      frame: () => frame,
      step: (count) => {
        const state = root().store.getState();
        if (state.frameloop !== "never") throw new Error("Gelung R3F belum dihentikan");
        for (let i = 0; i < count; i++) fiber.advance(++frame / 60, false, state);
      },
    };
  }, { fixed, address });
  const button = (name) => page.getByRole("button", { name, exact: true });
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Banding Watak");
  await button("Mula Misi").click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await page.waitForFunction((fixed) => {
    const { get, hasSkin } = window.capture;
    const root = get();
    if (!root || (fixed && root.frameloop !== "never")) return false;
    return (
      hasSkin(root.scene.getObjectByName("player")) && hasSkin(root.scene.getObjectByName("motor")) &&
      root.scene.getObjectByName("city-kit-suburban/building-type-m") &&
      root.scene.getObjectByName("car-kit/sedan")
    );
  }, fixed);
  await page.waitForLoadState("networkidle");
  return { page, button, errors };
}

function checkErrors(style, errors) {
  if (errors.length) throw new Error(`${style}: ${errors.join("\n")}`);
}

async function benchmark(style) {
  const { page, errors } = await setup(style, false);
  try {
    await page.evaluate((pos) => {
      const { restoreWorld, getWorldState } = window.capture;
      restoreWorld({ ...getWorldState(), pos });
    }, street);
    await page.waitForFunction(({ x, z }) => {
      const last = window.__mks.cameraSamples().at(-1);
      return last && last.px === x && last.pz === z;
    }, street);
    await page.waitForTimeout(1500);
    const sample = await page.evaluate(() => {
      const { scene, camera } = window.capture.get();
      return new Promise((resolve) => {
        const original = scene.onAfterRender;
        const duration = 10_000;
        let start;
        let frames = 0;
        let calls = 0;
        let triangles = 0;
        scene.onAfterRender = function (...args) {
          original.apply(this, args);
          if (args[2] !== camera) return;
          const now = performance.now();
          if (start === undefined) { start = now; return; }
          if (now - start > duration) {
            scene.onAfterRender = original;
            resolve({
              x: window.__mks.state().pos.x, z: window.__mks.state().pos.z,
              seconds: duration / 1000, frames, fps: frames / (duration / 1000),
              renderInfo: window.__mks.renderInfo(),
              meanRenderInfo: { calls: calls / frames, triangles: triangles / frames },
            });
            return;
          }
          const current = window.__mks.renderInfo();
          frames++;
          calls += current.calls;
          triangles += current.triangles;
        };
      });
    });
    expect({ x: sample.x, z: sample.z }).toEqual(street);
    expect(sample.frames).toBeGreaterThan(0);
    checkErrors(style, errors);
    return sample;
  } finally {
    await page.close();
  }
}

async function capture(style) {
  const { page, button, errors } = await setup(style, true);
  try {
    const step = (count) => page.evaluate((n) => window.capture.step(n), count);
    const state = () => page.evaluate(() => window.__mks.state());
    const action = async (label) => {
      await expect.poll(async () => (await state()).actionLabel).toBe(label);
      await page.keyboard.press("KeyE");
    };
    const at = async (id) => {
      /** Padankan kedudukan logik, objek adegan dan zon sebelum interaksi. */
      await page.evaluate((zone) => window.__mks.goTo(zone), id);
      await step(2);
      await expect.poll(async () => (await state()).nearbyZoneId).toBe(id);
    };
    const shots = {};
    const shot = async (name, offset, target, fov = 45) => {
      const { image, ...info } = await page.evaluate(({ offset, target, fov, name }) => {
        const { get, frame, game, delivery } = window.capture;
        const { camera, gl, scene } = get();
        const { x, z } = window.__mks.state().pos;
        const { worldMinutes, settings } = game.getState();
        const subject = scene.getObjectByName(name === "tunggang" ? "motor" : "player");
        if (Math.hypot(subject.parent.position.x - x, subject.parent.position.z - z) > 1e-6)
          throw new Error(`Kedudukan adegan tidak sepadan: ${name}`);
        const proof = camera.clone();
        proof.fov = fov;
        proof.position.set(x + offset[0], offset[1], z + offset[2]);
        const aim = [x + target[0], target[1], z + target[2]];
        proof.lookAt(...aim);
        proof.updateProjectionMatrix();
        const onAfterRender = scene.onAfterRender;
        try {
          scene.onAfterRender = () => {};
          gl.render(scene, proof);
          return {
            image: gl.domElement.toDataURL("image/png"), x, z, frame: frame(), worldMinutes,
            rain: settings.rainMode, camera: proof.position.toArray(), aim, fov,
            address: delivery.getState().session.handover?.zoneId ?? null,
          };
        } finally {
          scene.onAfterRender = onAfterRender;
          gl.render(scene, camera);
        }
      }, { offset, target, fov, name });
      shots[name] = info;
      writeFileSync(`${dir}/${style}-${name}.png`, Buffer.from(image.split(",")[1], "base64"));
    };

    await page.evaluate((pos) => {
      const { restoreWorld, getWorldState } = window.capture;
      restoreWorld({ ...getWorldState(), onFoot: true, pos });
    }, street);
    await step(36);
    await shot("luas", [9, 6.5, 12], [3, 1, -6]);
    await page.keyboard.down("KeyW");
    await step(18);
    await shot("jalan", [2.6, 1.55, 3.6], [0, 0.92, 0]);
    await page.keyboard.up("KeyW");
    if (style === "quaternius") await shot("pakaian-kurier", [1.25, 1.4, 2.25], [0, 0.99, 0]);

    await page.evaluate(() => window.__mks.goToMotor());
    await step(2);
    await action("NAIK MOTOR");
    await step(60);
    expect((await state()).onFoot).toBe(false);
    await shot("tunggang", [3.8, 1.5, 0.15], [0, 0.94, 0]);
    const reach = await page.evaluate((style) => {
      const { get, hasSkin, rigs, riderTargets } = window.capture;
      const motor = get().scene.getObjectByName("motor");
      const rider = motor.children.find((group) => group.visible && hasSkin(group));
      const names = rigs[style === "quaternius" ? "quaternius" : "mixamo"];
      const hips = rider.getObjectsByProperty("type", "Bone").find((bone) =>
        bone.children.length > 1 && bone.name.endsWith(names.hips));
      const prefix = hips.name.slice(0, -names.hips.length);
      const grip = riderTargets(0);
      return Object.fromEntries(["left", "right"].map((side) => {
        const upper = hips.getObjectByName(prefix + names[`${side}Arm`]);
        const lower = upper.getObjectByName(prefix + names[`${side}ForeArm`]);
        const hand = lower.getObjectByName(prefix + names[`${side}Hand`]);
        const target = motor.parent.localToWorld(grip[`${side}Hand`]);
        const shoulder = upper.getWorldPosition(target.clone());
        const elbow = lower.getWorldPosition(target.clone());
        const wrist = hand.getWorldPosition(target.clone());
        const upperLength = shoulder.distanceTo(elbow);
        const lowerLength = elbow.distanceTo(wrist);
        return [side, {
          bones: [upper.name, lower.name, hand.name],
          wristToGrip: wrist.distanceTo(target), upperLength, lowerLength,
          totalLength: upperLength + lowerLength, shoulderToGrip: shoulder.distanceTo(target),
        }];
      }));
    }, style);

    await at("zone-pickup-1");
    await action("BUKA GUDANG");
    await button("Imbas").first().click();
    await button("Muat").first().click();
    await button("Berangkat (1 paket)").click();
    const [first] = (await state()).cargo;
    expect(first.target).toBe(address);
    expect(first.cod).toBe(0);
    await at(address);
    await page.waitForFunction(() => {
      const { get, hasSkin } = window.capture;
      const { x, z } = window.__mks.state().pos;
      let ready = false;
      get().scene.traverse((node) => {
        if (node.isGroup && node.position.x === x && node.position.z === z - 1.5 && hasSkin(node)) ready = true;
      });
      return ready;
    });
    await page.evaluate(() => window.__mks.setNextCustomer("home"));
    await action("SERAH PAKET");
    await expect(button("Ambil bukti")).toBeVisible();
    await step(45);
    await shot("serah", [3.9, 1.75, 0.4], [0, 0.95, -0.7]);
    if (style === "quaternius") await shot("pakaian-penerima", [1.5, 1.35, 0.1], [0, 0.98, -1.5]);
    await button("Ambil bukti").click();
    await button("Serahkan paket").click();
    expect((await state()).cargo.find(({ id }) => id === first.id)?.status).toBe("delivered");
    checkErrors(style, errors);
    return { shots, reach };
  } finally {
    await page.close();
  }
}

try {
  let reference;
  for (const style of styles) {
    const benchmarkResult = await benchmark(style);
    const { shots, reach } = await capture(style);
    const conditions = Object.fromEntries(views.map((view) => [view, shots[view]]));
    if (reference) expect(conditions).toEqual(reference);
    else reference = conditions;
    for (const shot of Object.values(shots)) {
      expect(shot.worldMinutes).toBe(720);
      expect(shot.rain).toBe("off");
    }
    console.log(JSON.stringify({ style, benchmark: benchmarkResult, shots, reach }));
  }

  const page = await browser.newPage({ viewport: { width: width * styles.length, height: height + 44 } });
  for (const view of views) {
    const panels = styles.map((style) =>
      `<section><header>${style}</header><img alt="${style}" src="data:image/png;base64,${readFileSync(`${dir}/${style}-${view}.png`).toString("base64")}"></section>`,
    );
    await page.setContent(
      `<style>body{margin:0;display:flex;background:#252924;color:#fff;font:600 22px system-ui}section{width:${width}px}img{display:block;width:100%}header{box-sizing:border-box;height:44px;padding:7px 16px}</style>${panels.join("")}`,
    );
    await page.screenshot({ path: `${dir}/banding-${view}.png` });
  }
} finally {
  await browser.close();
}
