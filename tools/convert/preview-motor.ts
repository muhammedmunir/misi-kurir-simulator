/** Alat dev: pratonton calon model motor sebelah-menyebelah (panjang dinormalkan 1.9 m). */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const NAMES = [
  "delivery_scooter",
  "low_poly_delivery_electric_scooter",
  "low_poly_motorcycle_001",
  "moped_motorcycle",
  "yellow_scooter",
];

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#cfe0ee");
const cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
const view = new URLSearchParams(location.search).get("view") ?? "side";
if (view === "side") cam.position.set(0, 1.6, 9);
else cam.position.set(6, 3, 6);
cam.lookAt(0, 0.6, 0);
scene.add(new THREE.HemisphereLight("#d7e9ff", "#6b5a3e", 1.2));
const sun = new THREE.DirectionalLight("#fff1d8", 2.4);
sun.position.set(-4, 8, 5);
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: "#55575c" }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const loader = new GLTFLoader();
const info: string[] = [];
await Promise.all(
  NAMES.map(async (n, i) => {
    const g = await loader.loadAsync(`/assets-src/motor/${n}/scene.gltf`);
    const obj = g.scene;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    // Paksi panjang = paksi mendatar terbesar.
    const long = Math.max(size.x, size.z);
    const k = 1.9 / long;
    obj.scale.setScalar(k);
    const b2 = new THREE.Box3().setFromObject(obj);
    const c = b2.getCenter(new THREE.Vector3());
    obj.position.set(-c.x + (i - 2) * 2.6, -b2.min.y, -c.z);
    if (size.z > size.x) obj.rotation.y = Math.PI / 2;
    scene.add(obj);
    let tris = 0;
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) tris += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;
    });
    info.push(`${i + 1}. ${n}: saiz asal ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}, ${Math.round(tris)} segi tiga`);
  }),
);
renderer.render(scene, cam);
(window as unknown as { __info: string[] }).__info = info;
document.title = "siap";
