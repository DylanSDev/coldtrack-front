import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, MutableRefObject, ReactNode, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, ContactShadows, Environment, Grid, Html, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Activity, AlertTriangle, CheckCircle2, DoorOpen, Droplets, RotateCcw, Thermometer, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------
export type EquipmentTelemetry = {
  temperatura: number;
  humedad: number;
  estadoPuerta: "abierta" | "cerrada";
  corriente: number;
  vibracion: "normal" | "alta";
};

export type EquipmentSimulator3DProps = {
  equipmentName: string;
  telemetry: EquipmentTelemetry;
  onTelemetryChange?: (next: EquipmentTelemetry) => void;
  /** Opcional: reemplaza la heladera procedural por un modelo .glb. */
  modelUrl?: string;
  className?: string;
};

type HotspotId = "temperatura" | "humedad" | "estadoPuerta" | "corriente" | "vibracion";
type Vec3 = [number, number, number];

const SCENARIOS: { id: string; label: string; telemetry: EquipmentTelemetry }[] = [
  { id: "optimo", label: "Óptimo", telemetry: { temperatura: 3.2, humedad: 45, estadoPuerta: "cerrada", corriente: 2.8, vibracion: "normal" } },
  { id: "puerta", label: "Puerta Abierta", telemetry: { temperatura: 9.5, humedad: 78, estadoPuerta: "abierta", corriente: 3.1, vibracion: "normal" } },
  { id: "trabado", label: "Compresor Trabado", telemetry: { temperatura: 11.2, humedad: 60, estadoPuerta: "cerrada", corriente: 16.5, vibracion: "alta" } },
  { id: "contradiccion", label: "Contradicción de Sensores", telemetry: { temperatura: 12.0, humedad: 85, estadoPuerta: "cerrada", corriente: 2.9, vibracion: "normal" } },
];

function diagnose(t: EquipmentTelemetry) {
  const doorOpen = t.estadoPuerta === "abierta";
  const locked = t.corriente > 10 && t.vibracion === "alta";
  const contradiction = !doorOpen && !locked && t.temperatura > 8 && t.humedad > 75;
  return { doorOpen, locked, contradiction };
}

const sameTelemetry = (a: EquipmentTelemetry, b: EquipmentTelemetry) =>
  a.temperatura === b.temperatura &&
  a.humedad === b.humedad &&
  a.estadoPuerta === b.estadoPuerta &&
  a.corriente === b.corriente &&
  a.vibracion === b.vibracion;

const fmt = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Geometría base del gabinete (metros)
// ---------------------------------------------------------------------------
const W = 0.8;
const D = 0.72;
const H = 2.0;
const HB = 0.36; // sala de máquinas
const HC = 0.24; // cabecera
const T = 0.035; // espesor de panel
const DOOR_H = H - HB - HC;

/** Posición base y desplazamiento de despiece de cada parte. */
const PARTS = {
  canopy: { base: [0, 0, 0] as Vec3, offset: [0, 0.45, 0] as Vec3 },
  grille: { base: [0, 0, 0] as Vec3, offset: [0, -0.02, 0.5] as Vec3 },
  door: { base: [W / 2, HB, D / 2 + 0.022] as Vec3, offset: [0.95, 0, 0.45] as Vec3 },
  evaporator: { base: [0, HB + 0.72, -D / 2 + T + 0.06] as Vec3, offset: [0, 0, -0.85] as Vec3 },
  probe: { base: [-0.2, H - HC - 0.09, 0.08] as Vec3, offset: [-0.75, 0.3, 0.25] as Vec3 },
  compressor: { base: [-0.14, T, 0.02] as Vec3, offset: [-1.05, 0, 0.75] as Vec3 },
  iot: { base: [W / 2 + 0.03, 1.2, 0.08] as Vec3, offset: [0.7, 0, -0.3] as Vec3 },
};
const SHELF_Y = [0.62, 0.92, 1.22, 1.52];
const shelfOffset = (i: number): Vec3 => [0, (i - 1.5) * 0.1, 1.05];

const HOTSPOT_ANCHOR: Record<HotspotId, { part: keyof typeof PARTS; local: Vec3; cam: Vec3; side: "left" | "right" }> = {
  temperatura: { part: "probe", local: [0, 0, 0], cam: [0.9, 0.35, 1.7], side: "left" },
  humedad: { part: "evaporator", local: [0.3, 0.1, 0], cam: [1.1, 0.3, 2.0], side: "right" },
  estadoPuerta: { part: "canopy", local: [-W / 2 + 0.1, H - HC + 0.03, D / 2], cam: [-0.7, 0.3, 1.5], side: "left" },
  corriente: { part: "compressor", local: [0.27, 0.12, 0.1], cam: [0.9, 0.5, 1.6], side: "right" },
  vibracion: { part: "compressor", local: [0, 0.3, 0], cam: [-0.6, 0.6, 1.6], side: "left" },
};

// ---------------------------------------------------------------------------
// Animación compartida
// ---------------------------------------------------------------------------
type Anim = { explode: number; xray: number; door: number };
const AnimCtx = createContext<MutableRefObject<Anim> | null>(null);
const useAnim = () => useContext(AnimCtx)!;

function Part({ base, offset, children }: { base: Vec3; offset: Vec3; children: ReactNode }) {
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

function useMaterials() {
  return useMemo(() => {
    const shell = new THREE.MeshStandardMaterial({ color: "#e7ecf2", metalness: 0.35, roughness: 0.42, transparent: true });
    const dark = new THREE.MeshStandardMaterial({ color: "#1f2937", metalness: 0.5, roughness: 0.5, transparent: true });
    const chrome = new THREE.MeshStandardMaterial({ color: "#d7dde5", metalness: 0.95, roughness: 0.22 });
    const copper = new THREE.MeshStandardMaterial({ color: "#c77b43", metalness: 0.9, roughness: 0.3 });
    const alu = new THREE.MeshStandardMaterial({ color: "#aab4c0", metalness: 0.8, roughness: 0.35 });
    const frame = new THREE.MeshStandardMaterial({ color: "#111827", metalness: 0.7, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: "#9fd3ff", metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.14, depthWrite: false });
    const plastic = new THREE.MeshStandardMaterial({ color: "#f1f5f9", metalness: 0.05, roughness: 0.55 });
    const blue = new THREE.MeshStandardMaterial({ color: "#2563eb", metalness: 0.1, roughness: 0.45 });
    return { shell, dark, chrome, copper, alu, frame, glass, plastic, blue };
  }, []);
}
type Mats = ReturnType<typeof useMaterials>;

function Driver({ targets, mats }: { targets: Anim; mats: Mats }) {
  const anim = useAnim();
  useFrame((_, dt) => {
    const a = anim.current;
    a.explode = THREE.MathUtils.damp(a.explode, targets.explode, 4, dt);
    a.xray = THREE.MathUtils.damp(a.xray, targets.xray, 6, dt);
    a.door = THREE.MathUtils.damp(a.door, targets.door, 3.5, dt);
    const opacity = THREE.MathUtils.lerp(1, 0.1, a.xray);
    for (const m of [mats.shell, mats.dark]) {
      m.opacity = opacity;
      m.depthWrite = a.xray < 0.5;
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// Partes de la heladera
// ---------------------------------------------------------------------------
function Cabinet({ mats }: { mats: Mats }) {
  return (
    <group>
      <mesh material={mats.shell} position={[-W / 2 + T / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, D]} />
      </mesh>
      <mesh material={mats.shell} position={[W / 2 - T / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, D]} />
      </mesh>
      <mesh material={mats.shell} position={[0, H / 2, -D / 2 + T / 2]}>
        <boxGeometry args={[W - 2 * T, H, T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, T / 2, 0]}>
        <boxGeometry args={[W - 2 * T, T, D - T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, HB, 0.01]}>
        <boxGeometry args={[W - 2 * T, T, D - 2 * T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, H - HC, 0.01]}>
        <boxGeometry args={[W - 2 * T, T, D - 2 * T]} />
      </mesh>
      {/* patas */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={mats.frame} position={[sx * (W / 2 - 0.07), -0.03, sz * (D / 2 - 0.07)]}>
            <cylinderGeometry args={[0.025, 0.03, 0.06, 16]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Canopy({ mats, doorOpen, flag }: { mats: Mats; doorOpen: boolean; flag: boolean }) {
  const led = doorOpen ? "#fbbf24" : flag ? "#fb923c" : "#34d399";
  return (
    <Part {...PARTS.canopy}>
      <mesh material={mats.shell} position={[0, H - T / 2, 0]}>
        <boxGeometry args={[W, T, D]} />
      </mesh>
      <mesh material={mats.shell} position={[0, H - HC / 2, D / 2 - T / 2]}>
        <boxGeometry args={[W - 2 * T, HC, T]} />
      </mesh>
      {/* cartel luminoso */}
      <mesh position={[0, H - HC / 2, D / 2 + 0.002]}>
        <boxGeometry args={[W - 0.12, HC - 0.09, 0.006]} />
        <meshStandardMaterial color="#dbeafe" emissive="#93c5fd" emissiveIntensity={0.75} toneMapped={false} />
      </mesh>
      {/* sensor magnético de puerta (lado gabinete) */}
      <mesh material={mats.plastic} position={[-W / 2 + 0.1, H - HC + 0.028, D / 2 + 0.014]}>
        <boxGeometry args={[0.09, 0.028, 0.022]} />
      </mesh>
      <mesh position={[-W / 2 + 0.135, H - HC + 0.028, D / 2 + 0.027]}>
        <sphereGeometry args={[0.007, 12, 12]} />
        <meshStandardMaterial color={led} emissive={led} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </Part>
  );
}

function BaseGrille({ mats }: { mats: Mats }) {
  return (
    <Part {...PARTS.grille}>
      <mesh material={mats.dark} position={[0, HB / 2, D / 2 - T / 2]}>
        <boxGeometry args={[W - 2 * T, HB - T, T]} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} material={mats.dark} position={[0, 0.07 + i * 0.035, D / 2 + 0.004]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[W - 0.16, 0.014, 0.012]} />
        </mesh>
      ))}
    </Part>
  );
}

function Door({ mats }: { mats: Mats }) {
  const hinge = useRef<THREE.Group>(null);
  const anim = useAnim();
  useFrame(() => {
    if (hinge.current) hinge.current.rotation.y = anim.current.door * 1.85;
  });
  const f = 0.05;
  return (
    <Part {...PARTS.door}>
      <group ref={hinge}>
        <mesh material={mats.frame} position={[-W / 2, DOOR_H - f / 2, 0]}>
          <boxGeometry args={[W, f, 0.04]} />
        </mesh>
        <mesh material={mats.frame} position={[-W / 2, f / 2, 0]}>
          <boxGeometry args={[W, f, 0.04]} />
        </mesh>
        <mesh material={mats.frame} position={[-f / 2, DOOR_H / 2, 0]}>
          <boxGeometry args={[f, DOOR_H, 0.04]} />
        </mesh>
        <mesh material={mats.frame} position={[-W + f / 2, DOOR_H / 2, 0]}>
          <boxGeometry args={[f, DOOR_H, 0.04]} />
        </mesh>
        <mesh material={mats.glass} position={[-W / 2, DOOR_H / 2, 0]} renderOrder={2}>
          <boxGeometry args={[W - 2 * f, DOOR_H - 2 * f, 0.012]} />
        </mesh>
        {/* manija */}
        <mesh material={mats.chrome} position={[-W + 0.085, DOOR_H / 2, 0.045]}>
          <boxGeometry args={[0.022, 0.5, 0.022]} />
        </mesh>
        {/* imán del sensor de puerta */}
        <mesh material={mats.plastic} position={[-W + 0.1, DOOR_H - 0.03, 0.026]}>
          <boxGeometry args={[0.09, 0.028, 0.016]} />
        </mesh>
      </group>
    </Part>
  );
}

function Shelf({ mats }: { mats: Mats }) {
  const sw = W - 2 * T - 0.03;
  const sd = D - 2 * T - 0.16;
  const bars = 15;
  return (
    <group position={[0, 0, 0.05]}>
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} material={mats.chrome} position={[0, 0, (s * sd) / 2]}>
          <boxGeometry args={[sw, 0.012, 0.012]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} material={mats.chrome} position={[(s * sw) / 2, 0, 0]}>
          <boxGeometry args={[0.012, 0.012, sd]} />
        </mesh>
      ))}
      <mesh material={mats.chrome}>
        <boxGeometry args={[sw, 0.008, 0.008]} />
      </mesh>
      {Array.from({ length: bars }).map((_, i) => (
        <mesh key={i} material={mats.chrome} position={[-sw / 2 + ((i + 1) * sw) / (bars + 1), 0.006, 0]}>
          <boxGeometry args={[0.005, 0.005, sd]} />
        </mesh>
      ))}
    </group>
  );
}

function Evaporator({ mats }: { mats: Mats }) {
  const fins = 26;
  const width = 0.64;
  return (
    <Part {...PARTS.evaporator}>
      {Array.from({ length: fins }).map((_, i) => (
        <mesh key={i} material={mats.alu} position={[-width / 2 + (i * width) / (fins - 1), 0, 0]}>
          <boxGeometry args={[0.004, 1.05, 0.06]} />
        </mesh>
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} material={mats.copper} position={[0, -0.46 + i * 0.115, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.011, 0.011, width + 0.04, 12]} />
        </mesh>
      ))}
      {/* codos */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          material={mats.copper}
          position={[(i % 2 ? -1 : 1) * (width / 2 + 0.02), -0.4025 + i * 0.115, 0]}
          rotation={[0, 0, (i % 2 ? 1 : -1) * (Math.PI / 2)]}
        >
          <torusGeometry args={[0.0575, 0.011, 10, 16, Math.PI]} />
        </mesh>
      ))}
    </Part>
  );
}

function Probe({ mats, alert }: { mats: Mats; alert: boolean }) {
  const color = alert ? "#fb923c" : "#22d3ee";
  return (
    <Part {...PARTS.probe}>
      <mesh material={mats.plastic} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 16]} />
      </mesh>
      <mesh position={[0.085, 0, 0]}>
        <sphereGeometry args={[0.014, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh material={mats.frame} position={[-0.08, 0.04, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.09, 8]} />
      </mesh>
    </Part>
  );
}

function Compressor({ mats, locked }: { mats: Mats; locked: boolean }) {
  const shake = useRef<THREE.Group>(null);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0b0f14", metalness: 0.6, roughness: 0.3, emissive: "#ff2a1f", emissiveIntensity: 0 }), []);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const g = shake.current;
    if (g) {
      if (locked) {
        g.position.set(Math.sin(t * 90) * 0.004, 0, Math.cos(t * 70) * 0.004);
        g.rotation.z = Math.sin(t * 80) * 0.012;
      } else {
        g.position.set(0, 0, 0);
        g.rotation.z = 0;
      }
    }
    const target = locked ? 1.4 + Math.sin(t * 6) * 0.6 : 0;
    body.emissiveIntensity = THREE.MathUtils.damp(body.emissiveIntensity, target, 6, dt);
  });
  return (
    <Part {...PARTS.compressor}>
      <mesh material={mats.frame} position={[0.05, 0.01, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.34]} />
      </mesh>
      <group ref={shake}>
        <mesh material={body} position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.13, 0.135, 0.14, 32]} />
        </mesh>
        <mesh material={body} position={[0, 0.16, 0]} scale={[1, 0.85, 1]}>
          <sphereGeometry args={[0.13, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={mats.frame} position={[0, 0.155, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.132, 0.008, 8, 32]} />
        </mesh>
        <mesh material={mats.frame} position={[0.13, 0.11, 0]}>
          <boxGeometry args={[0.05, 0.07, 0.07]} />
        </mesh>
        {/* cañerías */}
        <mesh material={mats.copper} position={[-0.06, 0.3, -0.03]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 10]} />
        </mesh>
        <mesh material={mats.copper} position={[0.05, 0.3, -0.05]}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 10]} />
        </mesh>
        {/* acelerómetro sobre la carcasa */}
        <group position={[0, 0.275, 0.02]}>
          <mesh material={mats.blue}>
            <boxGeometry args={[0.06, 0.008, 0.045]} />
          </mesh>
          <mesh material={mats.frame} position={[0, 0.007, 0]}>
            <boxGeometry args={[0.018, 0.006, 0.018]} />
          </mesh>
        </group>
      </group>
      {/* pinza amperométrica sobre el cable de alimentación */}
      <group position={[0.27, 0.07, 0.1]}>
        <mesh material={mats.frame} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 0.3, 10]} />
        </mesh>
        <mesh material={mats.blue}>
          <boxGeometry args={[0.07, 0.08, 0.04]} />
        </mesh>
        <mesh material={mats.blue} position={[0, 0.05, 0]}>
          <boxGeometry args={[0.03, 0.02, 0.04]} />
        </mesh>
      </group>
      {/* condensador */}
      <group position={[0.36, 0.14, -0.14]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} material={mats.alu} position={[0, 0, -0.1 + i * 0.018]}>
            <boxGeometry args={[0.14, 0.22, 0.003]} />
          </mesh>
        ))}
      </group>
    </Part>
  );
}

function IotModule({ mats }: { mats: Mats }) {
  return (
    <Part {...PARTS.iot}>
      <mesh material={mats.frame}>
        <boxGeometry args={[0.05, 0.2, 0.14]} />
      </mesh>
      <mesh position={[0.027, 0.07, 0.04]}>
        <sphereGeometry args={[0.007, 12, 12]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh material={mats.frame} position={[0, 0.14, -0.05]}>
        <cylinderGeometry args={[0.006, 0.006, 0.1, 8]} />
      </mesh>
    </Part>
  );
}

/** Flujo de aire interno: circula en lazo y se escapa por el frente si la puerta está abierta. */
function AirFlow() {
  const N = 280;
  const anim = useAnim();
  const { geometry, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const s = Array.from({ length: N }, () => ({ u: Math.random(), x: (Math.random() - 0.5) * 0.6, w: Math.random() * Math.PI * 2, r: 0.75 + Math.random() * 0.5 }));
    return { geometry: g, seeds: s };
  }, []);
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
    pos.needsUpdate = true;
    material.color.lerpColors(ice, amber, door);
    material.opacity = 0.85 * (1 - anim.current.explode);
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------------------
// Hotspots y cámara
// ---------------------------------------------------------------------------
type HotspotDef = { id: HotspotId; n: number; label: string; value: string; alert: boolean };

const Z_RANGE: [number, number] = [30, 0];

function Hotspot({ def, active, onSelect, portal }: { def: HotspotDef; active: boolean; onSelect: (id: HotspotId) => void; portal: RefObject<HTMLElement> }) {
  const a = HOTSPOT_ANCHOR[def.id];
  const part = PARTS[a.part];
  const tone = def.alert ? "border-amber-400/70 text-amber-200" : active ? "border-cyan-300/80 text-white" : "border-white/15 text-slate-200";
  return (
    <Part base={part.base} offset={part.offset}>
      <Html position={a.local} zIndexRange={Z_RANGE} portal={portal}>
        <div
          className={`pointer-events-auto flex items-center ${a.side === "left" ? "flex-row-reverse" : ""}`}
          style={{ transform: a.side === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)" }}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-slate-900/60 ${def.alert ? "bg-amber-400" : "bg-cyan-300"}`} />
          <span className={`h-px w-12 shrink-0 ${def.alert ? "bg-amber-400/60" : "bg-cyan-300/50"}`} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(def.id);
          }}
          className={`flex items-center gap-2 whitespace-nowrap rounded-full border bg-slate-900/80 py-1 pl-1 pr-3 text-xs backdrop-blur transition-colors hover:border-cyan-300/80 ${tone}`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-slate-950 ${
              def.alert ? "bg-amber-400 animate-pulse" : "bg-cyan-400"
            }`}
          >
            {def.n}
          </span>
          <span>{def.label}:</span>
          <span className="font-semibold">{def.value}</span>
        </button>
        </div>
      </Html>
    </Part>
  );
}

const DEFAULT_VIEW = { pos: [2.5, 1.85, 3.5] as Vec3, target: [0, 1.0, 0] as Vec3 };
const CAMERA = { position: DEFAULT_VIEW.pos, fov: 36 };
const DPR: [number, number] = [1, 1.75];
const EXPLODED_VIEW = { pos: [3.4, 2.5, 5.2] as Vec3, target: [0, 1.0, 0.2] as Vec3 };

function CameraRig({ focus, exploded }: { focus: HotspotId | null; exploded: boolean }) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (!focus) {
      const v = exploded ? EXPLODED_VIEW : DEFAULT_VIEW;
      c.setLookAt(...v.pos, ...v.target, true);
      return;
    }
    const a = HOTSPOT_ANCHOR[focus];
    const p = PARTS[a.part];
    const e = exploded ? 1 : 0;
    const target: Vec3 = [p.base[0] + p.offset[0] * e + a.local[0], p.base[1] + p.offset[1] * e + a.local[1], p.base[2] + p.offset[2] * e + a.local[2]];
    c.setLookAt(target[0] + a.cam[0], target[1] + a.cam[1], target[2] + a.cam[2], ...target, true);
  }, [focus, exploded]);
  return <CameraControls ref={controls} makeDefault minDistance={1} maxDistance={9} maxPolarAngle={Math.PI / 2.02} smoothTime={0.35} />;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function Scene({
  telemetry,
  xray,
  exploded,
  focus,
  onSelect,
  modelUrl,
  overlay,
}: {
  overlay: HTMLDivElement | null;
  telemetry: EquipmentTelemetry;
  xray: boolean;
  exploded: boolean;
  focus: HotspotId | null;
  onSelect: (id: HotspotId) => void;
  modelUrl?: string;
}) {
  const mats = useMaterials();
  const anim = useRef<Anim>({ explode: 0, xray: 0, door: 0 });
  const portal = useMemo(() => ({ current: overlay }) as RefObject<HTMLElement>, [overlay]);
  const targets = useMemo<Anim>(() => ({ explode: 0, xray: 0, door: 0 }), []);
  const { doorOpen, locked, contradiction } = diagnose(telemetry);
  targets.explode = exploded ? 1 : 0;
  targets.xray = xray ? 1 : 0;
  targets.door = doorOpen ? 1 : 0;

  const hotspots: HotspotDef[] = [
    { id: "temperatura", n: 1, label: "Sonda térmica interior", value: `${fmt(telemetry.temperatura)} °C`, alert: contradiction || telemetry.temperatura > 8 },
    { id: "humedad", n: 2, label: "Evaporador y flujo de aire", value: `${fmt(telemetry.humedad, 0)} %`, alert: contradiction },
    { id: "estadoPuerta", n: 3, label: "Sensor magnético de puerta", value: doorOpen ? "Abierta" : "Cerrada", alert: doorOpen || contradiction },
    { id: "corriente", n: 4, label: "Pinza amperométrica", value: `${fmt(telemetry.corriente)} A`, alert: telemetry.corriente > 10 },
    { id: "vibracion", n: 5, label: "Acelerómetro del compresor", value: telemetry.vibracion === "alta" ? "Alta" : "Normal", alert: telemetry.vibracion === "alta" },
  ];

  return (
    <AnimCtx.Provider value={anim}>
      <Driver targets={targets} mats={mats} />
      <color attach="background" args={["#0F172A"]} />
      <fog attach="fog" args={["#16203a", 9, 22]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <pointLight position={[-3, 2, -2]} intensity={12} color="#38bdf8" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.5} position={[-5, 2, 1]} scale={[3, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 2, 2]} scale={[3, 6, 1]} rotation={[0, -Math.PI / 2, 0]} color="#bfdbfe" />
      </Environment>

      {modelUrl ? (
        <Suspense fallback={null}>
          <GltfModel url={modelUrl} />
        </Suspense>
      ) : (
        <group>
          <Cabinet mats={mats} />
          <Canopy mats={mats} doorOpen={doorOpen} flag={contradiction} />
          <BaseGrille mats={mats} />
          <Door mats={mats} />
          {SHELF_Y.map((y, i) => (
            <Part key={y} base={[0, y, 0]} offset={shelfOffset(i)}>
              <Shelf mats={mats} />
            </Part>
          ))}
          <Evaporator mats={mats} />
          <Probe mats={mats} alert={contradiction} />
          <Compressor mats={mats} locked={locked} />
          <IotModule mats={mats} />
          <AirFlow />
          {overlay &&
            hotspots.map((h) => <Hotspot key={h.id} def={h} active={focus === h.id} onSelect={onSelect} portal={portal} />)}
        </group>
      )}

      <ContactShadows position={[0, -0.059, 0]} opacity={0.55} scale={8} blur={2.6} far={3} />
      <Grid position={[0, -0.06, 0]} infiniteGrid cellSize={0.25} sectionSize={1} cellColor="#1e3a5f" sectionColor="#2b5b8a" fadeDistance={16} fadeStrength={2} />
      <CameraRig focus={focus} exploded={exploded} />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
      </EffectComposer>
    </AnimCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-200 hover:text-white"
    >
      {label}
      <span className={`relative h-4 w-8 rounded-full transition-colors ${checked ? "bg-cyan-500" : "bg-slate-600"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

const METRICS: { id: HotspotId; label: string; icon: LucideIcon }[] = [
  { id: "temperatura", label: "Temperatura", icon: Thermometer },
  { id: "humedad", label: "Humedad", icon: Droplets },
  { id: "estadoPuerta", label: "Puerta", icon: DoorOpen },
  { id: "corriente", label: "Corriente", icon: Zap },
  { id: "vibracion", label: "Vibración", icon: Activity },
];

export function EquipmentSimulator3D({ equipmentName, telemetry, onTelemetryChange, modelUrl, className = "" }: EquipmentSimulator3DProps) {
  const [local, setLocal] = useState(telemetry);
  const [xray, setXray] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [focus, setFocus] = useState<HotspotId | null>(null);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const clearFocus = useCallback(() => setFocus(null), []);

  useEffect(() => setLocal(telemetry), [telemetry]);

  const apply = (next: EquipmentTelemetry) => {
    setLocal(next);
    onTelemetryChange?.(next);
  };

  const { doorOpen, locked, contradiction } = diagnose(local);
  const alert = locked
    ? { title: "Compresor trabado", text: "Sobrecorriente con vibración alta. Cortar alimentación y revisar el compresor." }
    : doorOpen
      ? { title: "Puerta abierta", text: "El aire frío se está escapando por el frente del gabinete." }
      : contradiction
        ? { title: "Verificación visual requerida", text: "Temperatura y humedad altas con la puerta informada como cerrada." }
        : null;

  const values: Record<HotspotId, { text: string; alert: boolean }> = {
    temperatura: { text: `${fmt(local.temperatura)} °C`, alert: local.temperatura > 8 },
    humedad: { text: `${fmt(local.humedad, 0)} %`, alert: local.humedad > 75 },
    estadoPuerta: { text: doorOpen ? "Abierta" : "Cerrada", alert: doorOpen || contradiction },
    corriente: { text: `${fmt(local.corriente)} A`, alert: local.corriente > 10 },
    vibracion: { text: local.vibracion === "alta" ? "Alta" : "Normal", alert: local.vibracion === "alta" },
  };

  const selectHotspot = useCallback(
    (id: HotspotId) => {
      setFocus((cur) => (cur === id ? null : id));
      if (!exploded) setXray(true);
    },
    [exploded],
  );

  return (
    <div className={`relative h-full min-h-[520px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#0F172A] to-[#1E293B] ${className}`}>
      <Canvas dpr={DPR} camera={CAMERA} onPointerMissed={clearFocus}>
        <Scene telemetry={local} xray={xray} exploded={exploded} focus={focus} onSelect={selectHotspot} modelUrl={modelUrl} overlay={overlay} />
      </Canvas>
      {/* capa donde se montan las etiquetas flotantes */}
      <div ref={setOverlay} className="pointer-events-none absolute inset-0 isolate overflow-hidden" />

      {/* Título */}
      <div className="pointer-events-none absolute left-5 top-4">
        <h3 className="text-lg font-medium text-slate-100">{equipmentName}</h3>
        <p className="text-xs text-slate-400">Simulación 3D</p>
      </div>

      {/* Toggles */}
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center divide-x divide-white/10 rounded-full border border-white/15 bg-slate-900/70 backdrop-blur">
        <Toggle label="Modo Rayos X" checked={xray} onChange={setXray} />
        <Toggle label="Vista Explotada" checked={exploded} onChange={setExploded} />
      </div>

      {/* Panel de telemetría */}
      <div className="absolute right-4 top-16 w-56 rounded-xl border border-white/10 bg-slate-900/75 p-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-100">Telemetría</span>
          <span className={`inline-flex items-center gap-1 text-[11px] ${alert ? "text-amber-300" : "text-emerald-300"}`}>
            {alert ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {alert ? "Con alerta" : "En rango"}
          </span>
        </div>
        <ul className="space-y-1">
          {METRICS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => selectHotspot(id)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                  focus === id ? "border-cyan-400/60 bg-cyan-400/10" : "border-transparent hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-300">{label}</span>
                <span className="ml-auto flex items-center gap-1.5 font-semibold text-slate-100">
                  {values[id].alert && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                  {values[id].text}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {focus && (
          <button type="button" onClick={() => setFocus(null)} className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white">
            <RotateCcw className="h-3 w-3" />
            Restablecer vista
          </button>
        )}
      </div>

      {/* Alerta */}
      {alert && (
        <div className="absolute bottom-20 left-5 max-w-xs rounded-xl border border-amber-400/40 bg-slate-900/80 p-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {alert.title}
          </div>
          <p className="mt-1 text-xs text-slate-300">{alert.text}</p>
        </div>
      )}

      {/* Escenarios de prueba */}
      <div className="absolute bottom-4 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-white/15 bg-slate-900/70 p-1 backdrop-blur">
        <span className="px-2 text-[11px] text-slate-400">Escenario</span>
        {SCENARIOS.map((s) => {
          const on = sameTelemetry(s.telemetry, local);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => apply(s.telemetry)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${
                on ? "bg-cyan-500 font-medium text-slate-950" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default EquipmentSimulator3D;
