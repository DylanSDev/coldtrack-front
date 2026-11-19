import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

export type Vec3 = [number, number, number];
export type EquipmentVariant = "single" | "double" | "chest";
export type HotspotId = "temperatura" | "tempEvaporador" | "humedad" | "estadoPuerta" | "corriente" | "vibracion";
export type PartKey = "canopy" | "grille" | "door" | "evaporator" | "probe" | "ds18b20" | "compressor" | "iot";

export type Anim = { explode: number; xray: number; door: number };
export const AnimCtx = createContext<MutableRefObject<Anim> | null>(null);
export const useAnim = () => useContext(AnimCtx)!;

export type VariantTextures = {
  grain: THREE.CanvasTexture;
  sign: THREE.CanvasTexture;
  display: THREE.CanvasTexture;
};

export type VariantMats = {
  shell: THREE.MeshStandardMaterial;
  liner: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  edge: THREE.LineBasicMaterial;
  chrome: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  alu: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  blue: THREE.MeshStandardMaterial;
  pcb: THREE.MeshStandardMaterial;
  box: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
};

export type VariantConfig = {
  variant: EquipmentVariant;
  defaultView: { pos: Vec3; target: Vec3 };
  explodedView: { pos: Vec3; target: Vec3 };
  parts: Record<PartKey, { base: Vec3; offset: Vec3 }>;
  hotspots: Record<HotspotId, { part: PartKey; local: Vec3; cam: Vec3; side: "left" | "right" }>;
};

export const H = 2.0;
export const D = 0.72;
export const HB = 0.36;
export const HC = 0.24;
export const T = 0.035;
export const DOOR_H = H - HB - HC;
export const SHELF_Y = [0.62, 0.92, 1.22, 1.52];
export const shelfOffset = (i: number): Vec3 => [0, (i - 1.5) * 0.1, 1.05];

export const CW = 1.56;
export const CD = 0.76;
export const CH = 0.9;
export const MB_W = 0.44;
export const MB_H = 0.38;

export function resolveVariant(name: string, explicit?: EquipmentVariant): EquipmentVariant {
  if (explicit) return explicit;
  const normalized = name.toLowerCase();
  if (normalized.includes("freezer") || normalized.includes("horizontal")) return "chest";
  if (normalized.includes("doble") || normalized.includes("2 puertas")) return "double";
  return "single";
}

export function getVariantConfig(variant: EquipmentVariant): VariantConfig {
  if (variant === "double") {
    const w = 1.48;
    return {
      variant,
      defaultView: { pos: [2.95, 1.95, 4.1], target: [0, 1.0, 0] },
      explodedView: { pos: [3.9, 2.6, 5.8], target: [0, 1.0, 0.2] },
      parts: {
        canopy: { base: [0, 0, 0], offset: [0, 0.45, 0] },
        grille: { base: [0, 0, 0], offset: [0, -0.02, 0.55] },
        door: { base: [0, HB, D / 2 + 0.022], offset: [0, 0, 0.72] },
        evaporator: { base: [0, HB + 0.72, -D / 2 + T + 0.06], offset: [0, 0, -0.88] },
        probe: { base: [-0.42, H - HC - 0.09, 0.08], offset: [-1.05, 0.3, 0.25] },
        ds18b20: { base: [-0.5, HB + 0.56, -D / 2 + T + 0.085], offset: [-1.05, -0.05, -0.55] },
        compressor: { base: [-0.22, T, 0.02], offset: [-1.25, 0, 0.8] },
        iot: { base: [w / 2 + 0.03, 1.2, 0.08], offset: [0.75, 0, -0.3] },
      },
      hotspots: {
        temperatura: { part: "probe", local: [0, 0, 0], cam: [0.95, 0.35, 1.85], side: "left" },
        tempEvaporador: { part: "ds18b20", local: [0, 0, 0.02], cam: [-0.95, 0.25, 1.7], side: "left" },
        humedad: { part: "evaporator", local: [0.46, 0.1, 0], cam: [1.2, 0.3, 2.1], side: "right" },
        estadoPuerta: { part: "canopy", local: [-w / 2 + 0.12, H - HC + 0.03, D / 2], cam: [-0.85, 0.3, 1.65], side: "left" },
        corriente: { part: "compressor", local: [0.27, 0.12, 0.1], cam: [0.95, 0.5, 1.7], side: "right" },
        vibracion: { part: "compressor", local: [0, 0.3, 0], cam: [-0.7, 0.6, 1.7], side: "left" },
      },
    };
  }

  if (variant === "chest") {
    return {
      variant,
      defaultView: { pos: [2.35, 1.65, 2.85], target: [0, 0.48, 0] },
      explodedView: { pos: [3.2, 2.25, 4.1], target: [0, 0.58, 0.1] },
      parts: {
        canopy: { base: [0, 0, 0], offset: [0, 0.35, 0] },
        grille: { base: [0, 0, 0], offset: [0.2, -0.02, 0.48] },
        door: { base: [0, CH + 0.018, 0], offset: [0, 0.68, 0.18] },
        evaporator: { base: [-0.22, 0.48, -CD / 2 + T + 0.055], offset: [0, 0.22, -0.68] },
        probe: { base: [-0.58, CH - 0.16, 0.08], offset: [-0.68, 0.38, 0.25] },
        ds18b20: { base: [-0.54, 0.48, -CD / 2 + T + 0.08], offset: [-0.72, 0.18, -0.5] },
        compressor: { base: [CW / 2 - MB_W + 0.12, T, 0.02], offset: [0.85, 0, 0.65] },
        iot: { base: [CW / 2 + 0.03, 0.64, 0.08], offset: [0.68, 0.1, -0.25] },
      },
      hotspots: {
        temperatura: { part: "probe", local: [0, 0, 0], cam: [-0.8, 0.45, 1.5], side: "left" },
        tempEvaporador: { part: "ds18b20", local: [0, 0, 0.02], cam: [-0.85, 0.4, 1.55], side: "left" },
        humedad: { part: "evaporator", local: [0.32, 0.08, 0], cam: [0.6, 0.5, 1.75], side: "right" },
        estadoPuerta: { part: "canopy", local: [0.26, CH + 0.035, CD / 2 - 0.015], cam: [0.55, 0.5, 1.45], side: "right" },
        corriente: { part: "compressor", local: [0.216, 0.096, 0.08], cam: [0.85, 0.45, 1.45], side: "right" },
        vibracion: { part: "compressor", local: [0, 0.24, 0], cam: [0.45, 0.55, 1.5], side: "left" },
      },
    };
  }

  const w = 0.8;
  return {
    variant: "single",
    defaultView: { pos: [2.5, 1.85, 3.5], target: [0, 1.0, 0] },
    explodedView: { pos: [3.4, 2.5, 5.2], target: [0, 1.0, 0.2] },
    parts: {
      canopy: { base: [0, 0, 0], offset: [0, 0.45, 0] },
      grille: { base: [0, 0, 0], offset: [0, -0.02, 0.5] },
      door: { base: [w / 2, HB, D / 2 + 0.022], offset: [0.95, 0, 0.45] },
      evaporator: { base: [0, HB + 0.72, -D / 2 + T + 0.06], offset: [0, 0, -0.85] },
      probe: { base: [-0.2, H - HC - 0.09, 0.08], offset: [-0.75, 0.3, 0.25] },
      ds18b20: { base: [-0.28, HB + 0.56, -D / 2 + T + 0.085], offset: [-0.8, -0.05, -0.55] },
      compressor: { base: [-0.14, T, 0.02], offset: [-1.05, 0, 0.75] },
      iot: { base: [w / 2 + 0.03, 1.2, 0.08], offset: [0.7, 0, -0.3] },
    },
    hotspots: {
      temperatura: { part: "probe", local: [0, 0, 0], cam: [0.9, 0.35, 1.7], side: "left" },
      tempEvaporador: { part: "ds18b20", local: [0, 0, 0.02], cam: [-0.85, 0.25, 1.55], side: "left" },
      humedad: { part: "evaporator", local: [0.3, 0.1, 0], cam: [1.1, 0.3, 2.0], side: "right" },
      estadoPuerta: { part: "canopy", local: [-w / 2 + 0.1, H - HC + 0.03, D / 2], cam: [-0.7, 0.3, 1.5], side: "left" },
      corriente: { part: "compressor", local: [0.27, 0.12, 0.1], cam: [0.9, 0.5, 1.6], side: "right" },
      vibracion: { part: "compressor", local: [0, 0.3, 0], cam: [-0.6, 0.6, 1.6], side: "left" },
    },
  };
}

export function Part({ base, offset, children }: { base: Vec3; offset: Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const anim = useAnim();
  useFrame(() => {
    const e = anim.current.explode;
    ref.current?.position.set(base[0] + offset[0] * e, base[1] + offset[1] * e, base[2] + offset[2] * e);
  });
  return (
    <group ref={ref} position={base}>
      {children}
    </group>
  );
}

export function Pipe({ points, r, material }: { points: Vec3[]; r: number; material: THREE.Material }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.4,
    );
    return new THREE.TubeGeometry(curve, points.length * 12, r, 10, false);
  }, [points, r]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} />;
}

export function Fan({ r, mats, speed = 16 }: { r: number; mats: VariantMats; speed?: number }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * speed;
  });
  return (
    <group>
      <mesh material={mats.frame}>
        <torusGeometry args={[r, r * 0.07, 8, 36]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={mats.frame} rotation={[0, 0, (i * Math.PI) / 3]} position={[0, 0, r * 0.12]}>
          <boxGeometry args={[r * 2, r * 0.04, r * 0.04]} />
        </mesh>
      ))}
      <group ref={rotor}>
        <mesh material={mats.black} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 0.24, r * 0.24, r * 0.22, 20]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 5]}>
            <mesh material={mats.alu} position={[r * 0.56, 0, 0]} rotation={[0.55, 0, 0]}>
              <boxGeometry args={[r * 0.68, r * 0.34, 0.004]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export function UprightCabinet({ mats, doors }: { mats: VariantMats; doors: 1 | 2 }) {
  const w = doors === 2 ? 1.48 : 0.8;
  const inW = w - 2 * T;
  const cavY = HB + DOOR_H / 2;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, H, D)), [w]);
  useEffect(() => () => edges.dispose(), [edges]);
  const footX = doors === 2 ? [-w / 2 + 0.07, 0, w / 2 - 0.07] : [-w / 2 + 0.07, w / 2 - 0.07];

  return (
    <group>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[T, H, D]} radius={0.012} smoothness={3} material={mats.shell} position={[s * (w / 2 - T / 2), H / 2, 0]} />
      ))}
      <mesh material={mats.shell} position={[0, H / 2, -D / 2 + T / 2]}>
        <boxGeometry args={[inW, H, T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, T / 2, 0]}>
        <boxGeometry args={[inW, T, D - T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, HB, 0.01]}>
        <boxGeometry args={[inW, T, D - 2 * T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, H - HC, 0.01]}>
        <boxGeometry args={[inW, T, D - 2 * T]} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.liner} position={[s * (w / 2 - T - 0.005), cavY, 0.01]}>
          <boxGeometry args={[0.01, DOOR_H - 0.03, D - 2 * T - 0.02]} />
        </mesh>
      ))}
      <mesh material={mats.liner} position={[0, cavY, -D / 2 + T + 0.005]}>
        <boxGeometry args={[inW - 0.02, DOOR_H - 0.03, 0.01]} />
      </mesh>
      <mesh material={mats.liner} position={[0, HB + T / 2 + 0.004, 0.01]}>
        <boxGeometry args={[inW - 0.02, 0.008, D - 2 * T - 0.02]} />
      </mesh>

      {doors === 2 && (
        <group position={[0, cavY, D / 2 - T / 2]}>
          <mesh material={mats.shell}>
            <boxGeometry args={[0.042, DOOR_H, T]} />
          </mesh>
          <mesh material={mats.frame} position={[0, 0, T / 2 + 0.003]}>
            <boxGeometry args={[0.048, DOOR_H, 0.006]} />
          </mesh>
          {[-0.2, 0.24].map((z) => (
            <mesh key={z} material={mats.chrome} position={[0, 0, z - (D / 2 - T / 2)]}>
              <boxGeometry args={[0.012, DOOR_H - 0.14, 0.022]} />
            </mesh>
          ))}
        </group>
      )}

      {[-1, 1].flatMap((s) =>
        [-0.2, 0.24].map((z) => (
          <mesh key={`${s}${z}`} material={mats.chrome} position={[s * (w / 2 - T - 0.014), cavY, z]}>
            <boxGeometry args={[0.006, DOOR_H - 0.14, 0.022]} />
          </mesh>
        )),
      )}

      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - T - 0.024), cavY, D / 2 - T - 0.04]}>
          <mesh material={mats.alu}>
            <boxGeometry args={[0.02, DOOR_H - 0.12, 0.016]} />
          </mesh>
          <mesh position={[-s * 0.007, 0, -0.004]}>
            <boxGeometry args={[0.008, DOOR_H - 0.16, 0.01]} />
            <meshStandardMaterial color="#ffffff" emissive="#dbeafe" emissiveIntensity={1.0} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, HB + DOOR_H * 0.62, 0.12]} intensity={doors === 2 ? 0.85 : 0.55} distance={doors === 2 ? 2.4 : 1.7} color="#e0efff" />

      {footX.flatMap((fx) =>
        [-1, 1].map((sz) => (
          <group key={`${fx}${sz}`} position={[fx, 0, sz * (D / 2 - 0.07)]}>
            <mesh material={mats.chrome} position={[0, -0.022, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.045, 12]} />
            </mesh>
            <mesh material={mats.rubber} position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.03, 0.034, 0.016, 20]} />
            </mesh>
          </group>
        )),
      )}

      <lineSegments geometry={edges} material={mats.edge} position={[0, H / 2, 0]} />
    </group>
  );
}

export function UprightCanopy({
  mats,
  tex,
  doorOpen,
  flag,
  part,
  doors,
}: {
  mats: VariantMats;
  tex: VariantTextures;
  doorOpen: boolean;
  flag: boolean;
  part: { base: Vec3; offset: Vec3 };
  doors: 1 | 2;
}) {
  const w = doors === 2 ? 1.48 : 0.8;
  const inW = w - 2 * T;
  const led = doorOpen ? "#fbbf24" : flag ? "#fb923c" : "#34d399";
  const sensorX = doors === 2 ? [-w / 2 + 0.12, w / 2 - 0.12] : [-w / 2 + 0.1];

  return (
    <Part {...part}>
      <RoundedBox args={[w, T, D]} radius={0.012} smoothness={3} material={mats.shell} position={[0, H - T / 2, 0]} />
      <mesh material={mats.shell} position={[0, H - HC / 2, D / 2 - T / 2]}>
        <boxGeometry args={[inW, HC, T]} />
      </mesh>
      <mesh material={mats.frame} position={[0, H - HC / 2, D / 2 + 0.003]}>
        <boxGeometry args={[w - 0.08, HC - 0.05, 0.008]} />
      </mesh>
      <mesh position={[0, H - HC / 2, D / 2 + 0.0075]}>
        <planeGeometry args={[w - 0.11, HC - 0.08]} />
        <meshStandardMaterial map={tex.sign} emissiveMap={tex.sign} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.35} />
      </mesh>
      {sensorX.map((sx, idx) => (
        <group key={idx} position={[sx, H - HC + 0.028, D / 2 + 0.014]}>
          <RoundedBox args={[0.09, 0.028, 0.022]} radius={0.005} smoothness={2} material={mats.plastic} />
          <mesh position={[0.035, 0, 0.013]}>
            <sphereGeometry args={[0.006, 12, 12]} />
            <meshStandardMaterial color={led} emissive={led} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </Part>
  );
}

export function UprightBaseGrille({
  mats,
  tex,
  part,
  doors,
}: {
  mats: VariantMats;
  tex: VariantTextures;
  part: { base: Vec3; offset: Vec3 };
  doors: 1 | 2;
}) {
  const w = doors === 2 ? 1.48 : 0.8;
  const inW = w - 2 * T;
  const z = D / 2 - T / 2;
  const slatW = inW - 0.3;
  const slatX = -0.12;
  const ctrlX = w / 2 - T - 0.12;

  return (
    <Part {...part}>
      <mesh material={mats.dark} position={[0, HB - T / 2 - 0.02, z]}>
        <boxGeometry args={[inW, 0.035, T]} />
      </mesh>
      <mesh material={mats.dark} position={[0, 0.05, z]}>
        <boxGeometry args={[inW, 0.04, T]} />
      </mesh>
      {[-inW / 2 + 0.015, slatX + slatW / 2 + 0.02, inW / 2 - 0.015].map((x) => (
        <mesh key={x} material={mats.dark} position={[x, HB / 2 + 0.01, z]}>
          <boxGeometry args={[0.03, HB - T - 0.07, T]} />
        </mesh>
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} material={mats.dark} position={[slatX, 0.085 + i * 0.026, z + 0.004]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[slatW, 0.022, 0.006]} />
        </mesh>
      ))}
      <group position={[ctrlX, HB / 2 + 0.012, z + 0.004]}>
        <mesh material={mats.dark}>
          <boxGeometry args={[0.2, HB - T - 0.07, T * 0.6]} />
        </mesh>
        <RoundedBox args={[0.16, 0.085, 0.02]} radius={0.006} smoothness={2} material={mats.black} position={[0, 0.03, 0.012]} />
        <mesh position={[0, 0.04, 0.0225]}>
          <planeGeometry args={[0.12, 0.045]} />
          <meshStandardMaterial map={tex.display} emissiveMap={tex.display} emissive="#ffffff" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        {[-0.04, 0, 0.04].map((x) => (
          <mesh key={x} material={mats.steel} position={[x, 0.003, 0.0225]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.004, 12]} />
          </mesh>
        ))}
      </group>
    </Part>
  );
}

function DoorLeaf({ mats, width, hingeSide }: { mats: VariantMats; width: number; hingeSide: "left" | "right" }) {
  const f = 0.052;
  const th = 0.045;
  const dir = hingeSide === "right" ? -1 : 1;
  const center = (dir * width) / 2;
  const handleX = dir * (width - 0.035);
  const magnetX = dir * (width - 0.12);

  return (
    <group>
      <RoundedBox args={[width, f, th]} radius={0.008} smoothness={3} material={mats.frame} position={[center, DOOR_H - f / 2, 0]} />
      <RoundedBox args={[width, f, th]} radius={0.008} smoothness={3} material={mats.frame} position={[center, f / 2, 0]} />
      <RoundedBox args={[f, DOOR_H, th]} radius={0.008} smoothness={3} material={mats.frame} position={[(dir * f) / 2, DOOR_H / 2, 0]} />
      <RoundedBox args={[f, DOOR_H, th]} radius={0.008} smoothness={3} material={mats.frame} position={[dir * (width - f / 2), DOOR_H / 2, 0]} />
      {[DOOR_H - f / 2, f / 2].map((y) => (
        <mesh key={y} material={mats.rubber} position={[center, y, -th / 2 - 0.006]}>
          <boxGeometry args={[width - 0.03, 0.026, 0.012]} />
        </mesh>
      ))}
      {[(dir * f) / 2, dir * (width - f / 2)].map((x) => (
        <mesh key={x} material={mats.rubber} position={[x, DOOR_H / 2, -th / 2 - 0.006]}>
          <boxGeometry args={[0.026, DOOR_H - 0.03, 0.012]} />
        </mesh>
      ))}
      {[-0.011, 0.011].map((z) => (
        <mesh key={z} material={mats.glass} position={[center, DOOR_H / 2, z]} renderOrder={2}>
          <boxGeometry args={[width - 2 * f + 0.01, DOOR_H - 2 * f + 0.01, 0.005]} />
        </mesh>
      ))}
      <mesh material={mats.alu} position={[center, f + 0.003, 0]}>
        <boxGeometry args={[width - 2 * f, 0.006, 0.02]} />
      </mesh>
      <RoundedBox args={[0.026, DOOR_H - 0.3, 0.03]} radius={0.008} smoothness={3} material={mats.chrome} position={[handleX, DOOR_H / 2, th / 2 + 0.017]} />
      {[0.22, DOOR_H - 0.22].map((y) => (
        <mesh key={y} material={mats.chrome} position={[handleX, y, th / 2 + 0.004]}>
          <boxGeometry args={[0.02, 0.03, 0.012]} />
        </mesh>
      ))}
      {[-0.012, DOOR_H + 0.012].map((y) => (
        <mesh key={y} material={mats.chrome} position={[dir * 0.02, y, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.03, 16]} />
        </mesh>
      ))}
      <RoundedBox args={[0.09, 0.028, 0.016]} radius={0.004} smoothness={2} material={mats.plastic} position={[magnetX, DOOR_H - 0.03, th / 2 + 0.008]} />
    </group>
  );
}

export function DoubleDoors({ mats, part }: { mats: VariantMats; part: { base: Vec3; offset: Vec3 } }) {
  const leftHinge = useRef<THREE.Group>(null);
  const rightHinge = useRef<THREE.Group>(null);
  const anim = useAnim();
  const w = 1.48;
  const leafW = (w - 0.012) / 2;

  useFrame(() => {
    const d = anim.current.door;
    const e = anim.current.explode;
    if (leftHinge.current) {
      leftHinge.current.rotation.y = -d * 1.65;
      leftHinge.current.position.x = -w / 2 - e * 0.25;
    }
    if (rightHinge.current) {
      rightHinge.current.rotation.y = d * 1.65;
      rightHinge.current.position.x = w / 2 + e * 0.25;
    }
  });

  return (
    <Part {...part}>
      <group ref={leftHinge} position={[-w / 2, 0, 0]}>
        <DoorLeaf mats={mats} width={leafW} hingeSide="left" />
      </group>
      <group ref={rightHinge} position={[w / 2, 0, 0]}>
        <DoorLeaf mats={mats} width={leafW} hingeSide="right" />
      </group>
    </Part>
  );
}

function WireShelfGrid({ mats, sw, sd, wires }: { mats: VariantMats; sw: number; sd: number; wires: number }) {
  return (
    <group position={[0, 0, 0.05]}>
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} material={mats.chrome} position={[0, 0, (s * sd) / 2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, sw, 10]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} material={mats.chrome} position={[(s * sw) / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, sd, 10]} />
        </mesh>
      ))}
      {[-0.33, 0, 0.33].map((k) => (
        <mesh key={k} material={mats.chrome} position={[0, -0.006, k * sd]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, sw, 8]} />
        </mesh>
      ))}
      {Array.from({ length: wires }).map((_, i) => (
        <mesh key={i} material={mats.chrome} position={[-sw / 2 + ((i + 1) * sw) / (wires + 1), 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0025, 0.0025, sd, 6]} />
        </mesh>
      ))}
      <mesh material={mats.plastic} position={[0, -0.012, sd / 2 + 0.006]}>
        <boxGeometry args={[sw, 0.03, 0.004]} />
      </mesh>
    </group>
  );
}

export function UprightShelf({ mats, doors }: { mats: VariantMats; doors: 1 | 2 }) {
  const sd = D - 2 * T - 0.17;
  if (doors === 1) {
    const sw = 0.8 - 2 * T - 0.035;
    return <WireShelfGrid mats={mats} sw={sw} sd={sd} wires={24} />;
  }
  const bayW = (1.48 - 2 * T - 0.09) / 2;
  return (
    <group>
      <group position={[-(bayW / 2 + 0.022), 0, 0]}>
        <WireShelfGrid mats={mats} sw={bayW} sd={sd} wires={20} />
      </group>
      <group position={[bayW / 2 + 0.022, 0, 0]}>
        <WireShelfGrid mats={mats} sw={bayW} sd={sd} wires={20} />
      </group>
    </group>
  );
}

export function UprightEvaporator({
  mats,
  part,
  doors,
}: {
  mats: VariantMats;
  part: { base: Vec3; offset: Vec3 };
  doors: 1 | 2;
}) {
  const fins = doors === 2 ? 52 : 34;
  const width = doors === 2 ? 1.12 : 0.62;
  const fh = 0.82;
  const cy = -0.12;
  const fanXs = doors === 2 ? [-0.28, 0.28] : [0];

  return (
    <Part {...part}>
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.steel} position={[s * (width / 2 + 0.008), cy, 0]}>
          <boxGeometry args={[0.004, fh + 0.04, 0.075]} />
        </mesh>
      ))}
      {Array.from({ length: fins }).map((_, i) => (
        <mesh key={i} material={mats.alu} position={[-width / 2 + (i * width) / (fins - 1), cy, 0]}>
          <boxGeometry args={[0.003, fh, 0.06]} />
        </mesh>
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} material={mats.copper} position={[0, cy - 0.36 + i * 0.103, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, width + 0.05, 12]} />
        </mesh>
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh
          key={i}
          material={mats.copper}
          position={[(i % 2 ? -1 : 1) * (width / 2 + 0.025), cy - 0.3085 + i * 0.103, 0]}
          rotation={[0, 0, (i % 2 ? 1 : -1) * (Math.PI / 2)]}
        >
          <torusGeometry args={[0.0515, 0.01, 10, 16, Math.PI]} />
        </mesh>
      ))}
      <group position={[0, 0.44, 0.03]}>
        <RoundedBox args={[width + 0.02, 0.26, 0.05]} radius={0.01} smoothness={2} material={mats.plastic} />
        {fanXs.map((fx) => (
          <group key={fx} position={[fx, 0, 0]}>
            <mesh material={mats.rubber} position={[0, 0, 0.0255]}>
              <circleGeometry args={[0.105, 32]} />
            </mesh>
            <group position={[0, 0, 0.034]}>
              <Fan r={0.095} mats={mats} />
            </group>
          </group>
        ))}
      </group>
    </Part>
  );
}

export function ChestCabinet({ mats }: { mats: VariantMats }) {
  const inW = CW - 2 * T;
  const inD = CD - 2 * T;
  const tubLeftW = CW - MB_W - T;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, CH, CD)), []);
  useEffect(() => () => edges.dispose(), [edges]);

  return (
    <group>
      <RoundedBox args={[T, CH, CD]} radius={0.012} smoothness={3} material={mats.shell} position={[-CW / 2 + T / 2, CH / 2, 0]} />
      <RoundedBox args={[T, CH - MB_H, CD]} radius={0.012} smoothness={3} material={mats.shell} position={[CW / 2 - T / 2, MB_H + (CH - MB_H) / 2, 0]} />
      <mesh material={mats.shell} position={[0, CH / 2, -CD / 2 + T / 2]}>
        <boxGeometry args={[inW, CH, T]} />
      </mesh>
      <mesh material={mats.shell} position={[-MB_W / 2, CH / 2, CD / 2 - T / 2]}>
        <boxGeometry args={[inW - MB_W, CH, T]} />
      </mesh>
      <mesh material={mats.shell} position={[CW / 2 - MB_W / 2, MB_H + (CH - MB_H) / 2, CD / 2 - T / 2]}>
        <boxGeometry args={[MB_W - T, CH - MB_H, T]} />
      </mesh>
      <mesh material={mats.shell} position={[-MB_W / 2, T / 2, 0]}>
        <boxGeometry args={[tubLeftW, T, inD]} />
      </mesh>
      <mesh material={mats.shell} position={[CW / 2 - MB_W / 2, MB_H, 0]}>
        <boxGeometry args={[MB_W - T, T, inD]} />
      </mesh>
      <mesh material={mats.shell} position={[CW / 2 - MB_W, MB_H / 2, 0]}>
        <boxGeometry args={[T, MB_H, inD]} />
      </mesh>

      <mesh material={mats.liner} position={[0, CH / 2 + 0.02, -CD / 2 + T + 0.006]}>
        <boxGeometry args={[inW - 0.02, CH - 0.08, 0.008]} />
      </mesh>
      <mesh material={mats.liner} position={[-CW / 2 + T + 0.006, CH / 2 + 0.02, 0]}>
        <boxGeometry args={[0.008, CH - 0.08, inD - 0.02]} />
      </mesh>
      <mesh material={mats.liner} position={[-MB_W / 2, T + 0.006, 0]}>
        <boxGeometry args={[tubLeftW - 0.02, 0.008, inD - 0.02]} />
      </mesh>
      <mesh material={mats.liner} position={[CW / 2 - MB_W / 2, MB_H + T / 2 + 0.005, 0]}>
        <boxGeometry args={[MB_W - T - 0.02, 0.008, inD - 0.02]} />
      </mesh>

      <mesh position={[0, CH - 0.04, CD / 2 - T - 0.018]}>
        <boxGeometry args={[inW - 0.12, 0.01, 0.01]} />
        <meshStandardMaterial color="#ffffff" emissive="#dbeafe" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <pointLight position={[-0.15, CH - 0.18, 0]} intensity={0.65} distance={1.9} color="#e0efff" />

      {[-CW / 2 + 0.09, CW / 2 - 0.09].flatMap((fx) =>
        [-CD / 2 + 0.08, CD / 2 - 0.08].map((fz) => (
          <group key={`${fx}${fz}`} position={[fx, 0, fz]}>
            <mesh material={mats.frame} position={[0, -0.018, 0]}>
              <boxGeometry args={[0.05, 0.035, 0.05]} />
            </mesh>
            <mesh material={mats.rubber} position={[0, -0.042, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.024, 0.024, 0.022, 18]} />
            </mesh>
          </group>
        )),
      )}

      <lineSegments geometry={edges} material={mats.edge} position={[0, CH / 2, 0]} />
    </group>
  );
}

export function ChestCollar({
  mats,
  tex,
  doorOpen,
  flag,
  part,
}: {
  mats: VariantMats;
  tex: VariantTextures;
  doorOpen: boolean;
  flag: boolean;
  part: { base: Vec3; offset: Vec3 };
}) {
  const led = doorOpen ? "#fbbf24" : flag ? "#fb923c" : "#34d399";
  return (
    <Part {...part}>
      {[-1, 1].map((s) => (
        <RoundedBox key={`z${s}`} args={[CW + 0.02, 0.038, 0.055]} radius={0.01} smoothness={3} material={mats.frame} position={[0, CH + 0.01, s * (CD / 2 - 0.018)]} />
      ))}
      {[-1, 1].map((s) => (
        <RoundedBox key={`x${s}`} args={[0.055, 0.038, CD]} radius={0.01} smoothness={3} material={mats.frame} position={[s * (CW / 2 - 0.018), CH + 0.01, 0]} />
      ))}
      <RoundedBox args={[0.56, 0.14, 0.032]} radius={0.008} smoothness={2} material={mats.frame} position={[0, CH + 0.09, -CD / 2 + 0.022]} />
      <mesh position={[0, CH + 0.09, -CD / 2 + 0.039]}>
        <planeGeometry args={[0.52, 0.11]} />
        <meshStandardMaterial map={tex.sign} emissiveMap={tex.sign} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.35} />
      </mesh>
      <RoundedBox args={[0.09, 0.024, 0.022]} radius={0.005} smoothness={2} material={mats.plastic} position={[0.26, CH + 0.034, CD / 2 - 0.012]} />
      <mesh position={[0.295, CH + 0.034, CD / 2 + 0.001]}>
        <sphereGeometry args={[0.006, 12, 12]} />
        <meshStandardMaterial color={led} emissive={led} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </Part>
  );
}

export function ChestSlidingLids({ mats, part }: { mats: VariantMats; part: { base: Vec3; offset: Vec3 } }) {
  const rightLid = useRef<THREE.Group>(null);
  const anim = useAnim();
  const paneW = (CW - 0.09) / 2;
  const paneD = CD - 0.08;

  useFrame(() => {
    if (rightLid.current) {
      rightLid.current.position.x = paneW / 2 - 0.01 - anim.current.door * (paneW * 0.82);
    }
  });

  return (
    <Part {...part}>
      <group position={[-paneW / 2 + 0.01, 0, 0]}>
        <RoundedBox args={[paneW, 0.018, paneD]} radius={0.006} smoothness={2} material={mats.alu} />
        <mesh material={mats.glass} position={[0, 0.01, 0]} renderOrder={2}>
          <boxGeometry args={[paneW - 0.06, 0.006, paneD - 0.06]} />
        </mesh>
        <RoundedBox args={[0.022, 0.024, 0.18]} radius={0.006} smoothness={2} material={mats.chrome} position={[-paneW / 2 + 0.045, 0.018, 0]} />
      </group>

      <group ref={rightLid} position={[paneW / 2 - 0.01, 0.018, 0]}>
        <RoundedBox args={[paneW, 0.018, paneD]} radius={0.006} smoothness={2} material={mats.alu} />
        <mesh material={mats.glass} position={[0, 0.01, 0]} renderOrder={2}>
          <boxGeometry args={[paneW - 0.06, 0.006, paneD - 0.06]} />
        </mesh>
        <RoundedBox args={[0.022, 0.024, 0.18]} radius={0.006} smoothness={2} material={mats.chrome} position={[paneW / 2 - 0.045, 0.018, 0]} />
        <RoundedBox args={[0.085, 0.02, 0.016]} radius={0.004} smoothness={2} material={mats.plastic} position={[-0.1, 0.008, paneD / 2 - 0.01]} />
      </group>
    </Part>
  );
}

export function ChestMachineGrille({
  mats,
  tex,
  part,
}: {
  mats: VariantMats;
  tex: VariantTextures;
  part: { base: Vec3; offset: Vec3 };
}) {
  const gx = CW / 2 - MB_W / 2;
  const z = CD / 2 - T / 2;
  return (
    <Part {...part}>
      <group position={[gx, MB_H / 2, z]}>
        <RoundedBox args={[MB_W - 0.03, MB_H - 0.04, T * 0.8]} radius={0.008} smoothness={2} material={mats.dark} />
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} material={mats.frame} position={[-0.08, -MB_H / 2 + 0.06 + i * 0.032, 0.014]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[MB_W - 0.22, 0.018, 0.006]} />
          </mesh>
        ))}
        <group position={[MB_W / 2 - 0.11, 0.03, 0.014]}>
          <RoundedBox args={[0.14, 0.08, 0.018]} radius={0.006} smoothness={2} material={mats.black} />
          <mesh position={[0, 0.006, 0.01]}>
            <planeGeometry args={[0.11, 0.042]} />
            <meshStandardMaterial map={tex.display} emissiveMap={tex.display} emissive="#ffffff" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </Part>
  );
}

export function ChestBasket({ mats, index }: { mats: VariantMats; index: number }) {
  const bw = 0.34;
  const bd = CD - 2 * T - 0.06;
  const bh = 0.22;
  const bx = -0.48 + index * 0.44;
  const offset: Vec3 = [(index - 1) * 0.2, 0.36 + index * 0.07, 0.15];

  return (
    <Part base={[bx, CH - 0.03, 0]} offset={offset}>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.05, 0.014, 0.04]} radius={0.004} smoothness={2} material={mats.plastic} position={[0, 0, s * (bd / 2 + 0.01)]} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`topX${s}`} material={mats.chrome} position={[0, -0.01, (s * bd) / 2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, bw, 10]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`topZ${s}`} material={mats.chrome} position={[(s * bw) / 2, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, bd, 10]} />
        </mesh>
      ))}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = -bw / 2 + ((i + 1) * bw) / 12;
        return (
          <group key={i} position={[x, -bh / 2, 0]}>
            <mesh material={mats.chrome} position={[0, -bh / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0025, 0.0025, bd - 0.04, 6]} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} material={mats.chrome} position={[0, 0, s * (bd / 2 - 0.02)]}>
                <cylinderGeometry args={[0.0025, 0.0025, bh, 6]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </Part>
  );
}

export function ChestEvaporator({ mats, part }: { mats: VariantMats; part: { base: Vec3; offset: Vec3 } }) {
  const width = 0.88;
  const fh = 0.42;
  const fins = 38;
  return (
    <Part {...part}>
      {Array.from({ length: fins }).map((_, i) => (
        <mesh key={i} material={mats.alu} position={[-width / 2 + (i * width) / (fins - 1), 0, 0]}>
          <boxGeometry args={[0.003, fh, 0.045]} />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} material={mats.copper} position={[0, -0.16 + i * 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, width + 0.04, 12]} />
        </mesh>
      ))}
      <group position={[0.28, 0.04, 0.032]}>
        <RoundedBox args={[0.24, 0.22, 0.04]} radius={0.01} smoothness={2} material={mats.plastic} />
        <group position={[0, 0, 0.026]}>
          <Fan r={0.08} mats={mats} />
        </group>
      </group>
    </Part>
  );
}

export function VariantAirFlow({ variant }: { variant: EquipmentVariant }) {
  const N = 280;
  const anim = useAnim();
  const spanX = variant === "double" ? 1.25 : variant === "chest" ? 1.28 : 0.6;
  const { geometry, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const s = Array.from({ length: N }, () => ({
      u: Math.random(),
      x: (Math.random() - 0.5) * spanX,
      w: Math.random() * Math.PI * 2,
      r: 0.75 + Math.random() * 0.5,
    }));
    return { geometry: g, seeds: s };
  }, [spanX]);

  const material = useMemo(
    () => new THREE.PointsMaterial({ size: 0.022, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }),
    [],
  );
  const ice = useMemo(() => new THREE.Color("#7dd3fc"), []);
  const amber = useMemo(() => new THREE.Color("#fbbf24"), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const door = anim.current.door;
    const pos = geometry.attributes.position as THREE.BufferAttribute;

    if (variant === "chest") {
      const yTop = CH - 0.08;
      const yBot = 0.42;
      const zBack = -CD / 2 + 0.14;
      const zFront = CD / 2 - 0.12;
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const u = (s.u + t * 0.065 * s.r) % 1;
        let y: number;
        let z: number;
        if (u < 0.25) {
          const k = u / 0.25;
          y = yTop + (s.x > -0.1 ? Math.sin(k * Math.PI) * door * (0.28 + 0.2 * s.r) : 0);
          z = THREE.MathUtils.lerp(zBack, zFront, k);
        } else if (u < 0.5) {
          const k = (u - 0.25) / 0.25;
          y = THREE.MathUtils.lerp(yTop, yBot, k);
          z = zFront;
        } else if (u < 0.75) {
          const k = (u - 0.5) / 0.25;
          y = yBot;
          z = THREE.MathUtils.lerp(zFront, zBack, k);
        } else {
          const k = (u - 0.75) / 0.25;
          y = THREE.MathUtils.lerp(yBot, yTop, k);
          z = zBack;
        }
        const wob = Math.sin(t * 1.3 + s.w) * 0.02;
        pos.setXYZ(i, s.x + wob, y + Math.cos(t + s.w) * 0.02, z + wob);
      }
    } else {
      const yTop = H - HC - 0.1;
      const yBot = HB + 0.1;
      const zBack = -D / 2 + 0.16;
      const zFront = D / 2 - 0.08;
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const u = (s.u + t * 0.07 * s.r) % 1;
        let y: number;
        let z: number;
        if (u < 0.2) {
          const k = u / 0.2;
          y = yTop;
          z = THREE.MathUtils.lerp(zBack, zFront, k);
        } else if (u < 0.6) {
          const k = (u - 0.2) / 0.4;
          y = THREE.MathUtils.lerp(yTop, yBot, k);
          z = zFront + Math.sin(k * Math.PI) * door * (0.35 + 0.35 * s.r);
        } else if (u < 0.8) {
          const k = (u - 0.6) / 0.2;
          y = yBot;
          z = THREE.MathUtils.lerp(zFront, zBack, k);
        } else {
          const k = (u - 0.8) / 0.2;
          y = THREE.MathUtils.lerp(yBot, yTop, k);
          z = zBack;
        }
        const wob = Math.sin(t * 1.3 + s.w) * 0.02;
        pos.setXYZ(i, s.x + wob, y + Math.cos(t + s.w) * 0.03, z + wob);
      }
    }

    pos.needsUpdate = true;
    material.color.lerpColors(ice, amber, door);
    material.opacity = 0.85 * (1 - anim.current.explode);
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
