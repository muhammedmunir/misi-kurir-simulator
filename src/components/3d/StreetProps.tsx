import { useLayoutEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, CanvasTexture, type InstancedMesh, Object3D, SRGBColorSpace } from "three";
import { PlacementModels, batchPlacements } from "./PlacementModels";
import { streetProps } from "./city-blocks";
import { powerLineSegments } from "./power-lines";

const props = streetProps();
const data = batchPlacements(props);
const signs = props.filter(({ model }) => model.endsWith("/road-sign-street"));

function StreetName({ text, parity }: { text: string; parity: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const count = signs.filter((_, i) => i % 2 === parity).length;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#173e35";
      ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = "#f9f5d9";
      ctx.lineWidth = 4;
      ctx.strokeRect(7, 7, 498, 82);
      ctx.fillStyle = "#f9f5d9";
      ctx.font = "bold 47px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 51, 475);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [text]);
  useLayoutEffect(() => () => texture.dispose(), [texture]);
  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    const dummy = new Object3D();
    let index = 0;
    signs.forEach((p, i) => {
      if (i % 2 !== parity) return;
      const face = p.d / 2 + 0.015;
      dummy.position.set(p.x + Math.sin(p.rotY) * face, 2.44, p.z + Math.cos(p.rotY) * face);
      dummy.rotation.y = p.rotY;
      dummy.updateMatrix();
      instance.setMatrixAt(index++, dummy.matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
    instance.computeBoundingSphere();
  }, [parity]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} userData={{ noShadow: true }}>
      <planeGeometry args={[2.15, 0.4]} />
      <meshBasicMaterial map={texture} />
    </instancedMesh>
  );
}

/** Kabel elektrik melendut antara tiang (satu draw call; pengganti model wayar Kenney yang diregang). */
function PowerLines() {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(powerLineSegments(props.filter((p) => p.model.endsWith("/electricity-pole"))), 3),
    );
    g.computeBoundingSphere();
    return g;
  }, []);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments name="power-lines" geometry={geometry} userData={{ noShadow: true }}>
      <lineBasicMaterial color="#1f2328" />
    </lineSegments>
  );
}

export function StreetProps() {
  return (
    <>
      <PlacementModels data={data} />
      <PowerLines />
      <StreetName text="Jalan Mawar 3" parity={0} />
      <StreetName text="Lorong Cempaka" parity={1} />
    </>
  );
}
