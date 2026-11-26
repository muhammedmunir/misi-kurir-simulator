/*
 * Diadaptasi daripada SimplifyModifier.js (Three.js), berasaskan algoritma
 * progressive mesh Stan Melax (1998): http://www.melax.com/polychop/
 *
 * The MIT License
 * Copyright © 2010-2024 three.js authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

class Vertex {
  faces = new Set<Face>();
  neighbor: Vertex | null = null;
  cost = 0;
  id = -1;

  constructor(
    readonly sourceId: number,
    readonly position: Vector3,
  ) {}

  neighbors() {
    const result = new Set<Vertex>();
    for (const face of this.faces) for (const vertex of face.vertices) if (vertex !== this) result.add(vertex);
    return result;
  }
}

const ab = new Vector3();
const cb = new Vector3();

class Face {
  normal = new Vector3();
  removed = false;

  constructor(
    readonly vertices: [Vertex, Vertex, Vertex],
    readonly group: number,
  ) {
    this.updateNormal();
    for (const vertex of vertices) vertex.faces.add(this);
  }

  updateNormal() {
    const [a, b, c] = this.vertices;
    this.normal.copy(cb.subVectors(c.position, b.position).cross(ab.subVectors(a.position, b.position)).normalize());
  }
}

function updateCost(u: Vertex) {
  let best = Infinity;
  let total = 0;
  let count = 0;
  u.neighbor = null;
  for (const v of u.neighbors()) {
    const sides = [...u.faces].filter((face) => face.vertices.includes(v));
    let curvature = sides.length < 2 ? 1 : 0;
    for (const face of u.faces) {
      const closest = Math.min(...sides.map((side) => (1.001 - face.normal.dot(side.normal)) / 2));
      curvature = Math.max(curvature, closest);
    }
    const cost = u.position.distanceTo(v.position) * curvature;
    if (cost < best) {
      best = cost;
      u.neighbor = v;
    }
    total += cost;
    count++;
  }
  u.cost = count ? total / count : -0.01;
}

function copyAttribute(attribute: BufferAttribute, vertices: Vertex[]) {
  const { array, itemSize, normalized } = attribute;
  const copy = array.slice(0, vertices.length * itemSize);
  for (const v of vertices) {
    const start = v.sourceId * itemSize;
    copy.set(array.subarray(start, start + itemSize), v.id * itemSize);
  }
  return new BufferAttribute(copy, itemSize, normalized);
}

/** Mengekalkan atribut bucu (termasuk kulit), sasaran morf dan kumpulan bahan FBX. */
export function simplifySkinned(input: BufferGeometry, target: number): BufferGeometry {
  const geometry = mergeVertices(input, 1e-6);
  const index = geometry.getIndex();
  if (!index || index.count / 3 <= target) return input;

  const position = geometry.getAttribute("position");
  const vertices = Array.from(
    { length: position.count },
    (_, id) => new Vertex(id, new Vector3().fromBufferAttribute(position, id)),
  );
  const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: index.count, materialIndex: 0 }];
  const faces = groups.flatMap(({ start, count }, group) => {
    const range: Face[] = [];
    for (let i = start; i < start + count; i += 3) {
      const a = vertices[index.getX(i)];
      const b = vertices[index.getX(i + 1)];
      const c = vertices[index.getX(i + 2)];
      if (a !== b && b !== c && c !== a) range.push(new Face([a, b, c], group));
    }
    return range;
  });
  const active = new Set(vertices);
  for (const vertex of active) updateCost(vertex);

  let remaining = faces.length;
  while (remaining > target) {
    let u: Vertex | undefined;
    for (const v of active) if (!u || v.cost < u.cost) u = v;
    if (!u) break;
    const v = u.neighbor;
    const neighbors = u.neighbors();
    for (const face of u.faces) {
      if (!v || face.vertices.includes(v)) {
        face.removed = true;
        remaining--;
        for (const vertex of face.vertices) vertex.faces.delete(face);
      } else {
        face.vertices[face.vertices.indexOf(u)] = v;
        v.faces.add(face);
        face.updateNormal();
      }
    }
    active.delete(u);
    for (const neighbor of neighbors) updateCost(neighbor);
  }

  // Indeks bucu sumber disimpan dalam sourceId walaupun id output berubah.
  const kept = vertices.filter((v) => active.has(v) && v.faces.size);
  kept.forEach((v, id) => {
    v.id = id;
  });
  const result = new BufferGeometry();
  const indices: number[] = [];
  for (const [group, { materialIndex }] of groups.entries()) {
    const start = indices.length;
    for (const face of faces)
      if (!face.removed && face.group === group) indices.push(...face.vertices.map((v) => v.id));
    if (geometry.groups.length && indices.length > start) result.addGroup(start, indices.length - start, materialIndex);
  }
  result.setIndex(indices);
  result.name = input.name;
  result.morphTargetsRelative = input.morphTargetsRelative;
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    result.setAttribute(name, copyAttribute(attr as BufferAttribute, kept));
  }
  const morphAttributes = geometry.morphAttributes as Record<string, BufferAttribute[]>;
  const resultMorphAttributes = result.morphAttributes as Record<string, BufferAttribute[]>;
  for (const [name, attrs] of Object.entries(morphAttributes)) {
    resultMorphAttributes[name] = attrs.map((attr) => copyAttribute(attr, kept));
  }
  return result;
}
