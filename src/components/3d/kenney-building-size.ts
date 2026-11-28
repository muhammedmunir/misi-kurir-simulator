// Dimensi accessor POSITION dalam GLB Kenney, sebelum skala (X, Y, Z).
const suburban = {
  "building-type-a": [1.3, 0.833541, 1.028138],
  "building-type-b": [1.828, 1.1375, 1.14],
  "building-type-c": [1.28638, 1.033541, 1.028138],
  "building-type-d": [1.75638, 1.2375, 1.028],
  "building-type-e": [1.3, 1.1375, 1.028],
  "building-type-f": [1.428, 1.1375, 1.405891],
  "building-type-g": [1.45, 0.76821, 1.178],
  "building-type-h": [1.3, 0.7375, 0.916],
  "building-type-i": [1.28638, 0.7375, 1.028],
  "building-type-m": [1.428, 0.7375, 1.428],
  "building-type-o": [1.27, 1.1375, 1.028],
  "building-type-r": [1.028, 1.141143, 1.02],
};

const commercial = {
  "building-a": [0.883588, 1.293, 0.94],
  "building-b": [0.97, 1.293, 0.94],
  "building-c": [0.883588, 0.893, 1.09],
  "building-d": [0.84, 1.293, 0.9],
  "building-e": [1.64, 0.893, 1.007892],
  "building-f": [0.84, 1.693, 1.03],
  "building-g": [0.97, 1.693, 0.922],
  "building-h": [0.883588, 1.293, 1.007891],
  "building-i": [1.24, 1.68, 1.302],
  "building-j": [2.083588, 1.693, 1.34],
  "building-k": [2.083588, 1.47, 0.942],
  "building-l": [1.37, 2.27, 1.402],
  "building-m": [1.24, 3.15, 1.242],
  "building-n": [2.32, 2.48, 1.82],
  "building-skyscraper-a": [1.36, 2.88, 1.36],
  "building-skyscraper-b": [1.36, 4.48, 1.36],
  "building-skyscraper-c": [1.28, 4.08, 1.387891],
  "building-skyscraper-d": [1.28, 5.469999, 1.387891],
  "building-skyscraper-e": [1.295, 4.08, 1.242],
  "low-detail-building-c": [0.5, 2.25, 0.5],
  "low-detail-building-j": [0.5, 1.75, 0.5],
};

// Kedua-dua pintu rujukan berukuran 0.270 unit asli: 0.270 × 7.8 = 2.106 m.
const SUBURBAN_SCALE = 7.8;
const COMMERCIAL_SCALE = 7.8;

function scaledSize(sizes: Readonly<Record<string, number[]>>, model: string, scale: number) {
  const dims = sizes[model];
  if (!dims) throw new Error(`Dimensi asal tidak tersedia: ${model}`);
  const [x, y, z] = dims;
  return { w: x * scale, h: y * scale, d: z * scale };
}

export function suburbanBuildingSize(model: string) {
  return scaledSize(suburban, model, SUBURBAN_SCALE);
}

export function commercialBuildingSize(model: string) {
  return scaledSize(commercial, model, COMMERCIAL_SCALE);
}

export function commercialBuildingModel(height: number, index: number): string {
  const letters = height > 15 ? "abcde" : "abcdefghijklmn";
  const prefix = height > 15 ? "building-skyscraper-" : "building-";
  return `${prefix}${letters[index % letters.length]}`;
}
