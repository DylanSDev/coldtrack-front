import { createContext, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, MutableRefObject, ReactNode, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Environment, Grid, Html, Lightformer, RoundedBox, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { Activity, AlertTriangle, CheckCircle2, DoorOpen, Droplets, Maximize2, Minimize2, RotateCcw, Thermometer, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

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

// ---------------------------------------------------------------------------
// Texturas y materiales
// ---------------------------------------------------------------------------
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function useTextures(tempText: string, tempAlert: boolean) {
  const fixed = useMemo(() => {
    const grain = canvasTexture(256, 256, (ctx) => {
      let s = 11;
      const img = ctx.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const v = 170 + (s / 4294967296) * 60;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
    grain.colorSpace = THREE.NoColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(5, 9);

    const sign = canvasTexture(1024, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#1d6ee0");
      g.addColorStop(1, "#034AAD");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1024, 256);
      const glow = ctx.createRadialGradient(512, 110, 20, 512, 128, 520);
      glow.addColorStop(0, "rgba(255,255,255,0.28)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 132px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ColdTrack", 512, 136);
    });
    return { grain, sign };
  }, []);
  useEffect(() => () => Object.values(fixed).forEach((t) => t.dispose()), [fixed]);

  const display = useMemo(
    () =>
      canvasTexture(256, 96, (ctx) => {
        ctx.fillStyle = "#020405";
        ctx.fillRect(0, 0, 256, 96);
        ctx.font = `700 60px ${MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = tempAlert ? "#ff5a4d" : "#5eead4";
        ctx.fillText(`${tempText}°`, 128, 52);
      }),
    [tempText, tempAlert],
  );
  useEffect(() => () => display.dispose(), [display]);

  return { ...fixed, display };
}
type Textures = ReturnType<typeof useTextures>;

function useMaterials(grain: THREE.Texture) {
  return useMemo(() => {
    const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
    const glass = std({ color: "#bfe3ff", metalness: 0.15, roughness: 0.03, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 1.6 });
    glass.userData.noShadow = true;
    return {
      // se desvanecen en Modo Rayos X
      shell: std({ color: "#eef1f4", metalness: 0.18, roughness: 0.4, roughnessMap: grain, bumpMap: grain, bumpScale: 0.12, transparent: true }),
      liner: std({ color: "#f8fafb", metalness: 0.02, roughness: 0.55, transparent: true }),
      dark: std({ color: "#1a1f27", metalness: 0.45, roughness: 0.5, transparent: true }),
      edge: new THREE.LineBasicMaterial({ color: new THREE.Color(0.7, 1.5, 2.2), transparent: true, opacity: 0, toneMapped: false }),
      // fijos
      chrome: std({ color: "#dfe4ea", metalness: 1, roughness: 0.2 }),
      steel: std({ color: "#b9c1cb", metalness: 0.9, roughness: 0.38 }),
      copper: std({ color: "#c9793f", metalness: 1, roughness: 0.28 }),
      alu: std({ color: "#b4bdc8", metalness: 0.85, roughness: 0.34 }),
      frame: std({ color: "#1c2128", metalness: 0.75, roughness: 0.34 }),
      rubber: std({ color: "#0a0c0f", metalness: 0, roughness: 0.9 }),
      plastic: std({ color: "#e4e8ec", metalness: 0.02, roughness: 0.5 }),
      black: std({ color: "#0b0e12", metalness: 0.55, roughness: 0.28 }),
      blue: std({ color: "#1f5fe0", metalness: 0.05, roughness: 0.4 }),
      pcb: std({ color: "#1b3c9c", metalness: 0.25, roughness: 0.5 }),
      box: std({ color: "#2a333f", metalness: 0.08, roughness: 0.75 }),
      floor: std({ color: "#0a1322", metalness: 0.35, roughness: 0.62 }),
      glass,
    };
  }, [grain]);
}
type Mats = ReturnType<typeof useMaterials>;

function Driver({ targets, mats }: { targets: Anim; mats: Mats }) {
  const anim = useAnim();
  useFrame((_, dt) => {
    const a = anim.current;
    a.explode = THREE.MathUtils.damp(a.explode, targets.explode, 4, dt);
    a.xray = THREE.MathUtils.damp(a.xray, targets.xray, 6, dt);
    a.door = THREE.MathUtils.damp(a.door, targets.door, 3.5, dt);
    const opacity = THREE.MathUtils.lerp(1, 0.09, a.xray);
    for (const m of [mats.shell, mats.liner, mats.dark]) {
      m.opacity = opacity;
      m.depthWrite = a.xray < 0.5;
    }
    mats.edge.opacity = a.xray * 0.85;
  });
  return null;
}

/** Activa sombras en las mallas opacas del grupo. */
function Shadows({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      if (mat.userData.noShadow || mat.type === "MeshBasicMaterial") return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  });
  return <group ref={ref}>{children}</group>;
}

function Pipe({ points, r, material }: { points: Vec3[]; r: number; material: THREE.Material }) {
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

/** Ventilador axial mirando hacia +Z. */
function Fan({ r, mats, speed = 16 }: { r: number; mats: Mats; speed?: number }) {
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

// ---------------------------------------------------------------------------
// Partes de la heladera
// ---------------------------------------------------------------------------
const IN_W = W - 2 * T;
const CAV_Y = HB + DOOR_H / 2;

function Cabinet({ mats }: { mats: Mats }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), []);
  useEffect(() => () => edges.dispose(), [edges]);
  return (
    <group>
      {/* carcasa */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[T, H, D]} radius={0.012} smoothness={3} material={mats.shell} position={[s * (W / 2 - T / 2), H / 2, 0]} />
      ))}
      <mesh material={mats.shell} position={[0, H / 2, -D / 2 + T / 2]}>
        <boxGeometry args={[IN_W, H, T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, T / 2, 0]}>
        <boxGeometry args={[IN_W, T, D - T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, HB, 0.01]}>
        <boxGeometry args={[IN_W, T, D - 2 * T]} />
      </mesh>
      <mesh material={mats.shell} position={[0, H - HC, 0.01]}>
        <boxGeometry args={[IN_W, T, D - 2 * T]} />
      </mesh>

      {/* revestimiento interior */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.liner} position={[s * (W / 2 - T - 0.005), CAV_Y, 0.01]}>
          <boxGeometry args={[0.01, DOOR_H - 0.03, D - 2 * T - 0.02]} />
        </mesh>
      ))}
      <mesh material={mats.liner} position={[0, CAV_Y, -D / 2 + T + 0.005]}>
        <boxGeometry args={[IN_W - 0.02, DOOR_H - 0.03, 0.01]} />
      </mesh>
      <mesh material={mats.liner} position={[0, HB + T / 2 + 0.004, 0.01]}>
        <boxGeometry args={[IN_W - 0.02, 0.008, D - 2 * T - 0.02]} />
      </mesh>

      {/* cremalleras para estantes */}
      {[-1, 1].flatMap((s) =>
        [-0.2, 0.24].map((z) => (
          <mesh key={`${s}${z}`} material={mats.chrome} position={[s * (W / 2 - T - 0.014), CAV_Y, z]}>
            <boxGeometry args={[0.006, DOOR_H - 0.14, 0.022]} />
          </mesh>
        )),
      )}

      {/* tiras LED verticales */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 - T - 0.024), CAV_Y, D / 2 - T - 0.04]}>
          <mesh material={mats.alu}>
            <boxGeometry args={[0.02, DOOR_H - 0.12, 0.016]} />
          </mesh>
          <mesh position={[-s * 0.007, 0, -0.004]}>
            <boxGeometry args={[0.008, DOOR_H - 0.16, 0.01]} />
            <meshStandardMaterial color="#ffffff" emissive="#dbeafe" emissiveIntensity={1.0} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, HB + DOOR_H * 0.62, 0.12]} intensity={0.55} distance={1.7} color="#e0efff" />

      {/* patas regulables */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * (W / 2 - 0.07), 0, sz * (D / 2 - 0.07)]}>
            <mesh material={mats.chrome} position={[0, -0.022, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.045, 12]} />
            </mesh>
            <mesh material={mats.rubber} position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.03, 0.034, 0.016, 20]} />
            </mesh>
          </group>
        )),
      )}

      {/* contorno visible en Modo Rayos X */}
      <lineSegments geometry={edges} material={mats.edge} position={[0, H / 2, 0]} />
    </group>
  );
}

function Canopy({ mats, tex, doorOpen, flag }: { mats: Mats; tex: Textures; doorOpen: boolean; flag: boolean }) {
  const led = doorOpen ? "#fbbf24" : flag ? "#fb923c" : "#34d399";
  return (
    <Part {...PARTS.canopy}>
      <RoundedBox args={[W, T, D]} radius={0.012} smoothness={3} material={mats.shell} position={[0, H - T / 2, 0]} />
      <mesh material={mats.shell} position={[0, H - HC / 2, D / 2 - T / 2]}>
        <boxGeometry args={[IN_W, HC, T]} />
      </mesh>
      {/* cartel luminoso */}
      <mesh material={mats.frame} position={[0, H - HC / 2, D / 2 + 0.003]}>
        <boxGeometry args={[W - 0.08, HC - 0.05, 0.008]} />
      </mesh>
      <mesh position={[0, H - HC / 2, D / 2 + 0.0075]}>
        <planeGeometry args={[W - 0.11, HC - 0.08]} />
        <meshStandardMaterial map={tex.sign} emissiveMap={tex.sign} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.35} />
      </mesh>
      {/* sensor magnético de puerta (lado gabinete) */}
      <RoundedBox args={[0.09, 0.028, 0.022]} radius={0.005} smoothness={2} material={mats.plastic} position={[-W / 2 + 0.1, H - HC + 0.028, D / 2 + 0.014]} />
      <mesh position={[-W / 2 + 0.135, H - HC + 0.028, D / 2 + 0.027]}>
        <sphereGeometry args={[0.006, 12, 12]} />
        <meshStandardMaterial color={led} emissive={led} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </Part>
  );
}

function BaseGrille({ mats, tex }: { mats: Mats; tex: Textures }) {
  const z = D / 2 - T / 2;
  const slatW = IN_W - 0.3;
  const slatX = -0.12;
  return (
    <Part {...PARTS.grille}>
      {/* marco */}
      <mesh material={mats.dark} position={[0, HB - T / 2 - 0.02, z]}>
        <boxGeometry args={[IN_W, 0.035, T]} />
      </mesh>
      <mesh material={mats.dark} position={[0, 0.05, z]}>
        <boxGeometry args={[IN_W, 0.04, T]} />
      </mesh>
      {[-IN_W / 2 + 0.015, slatX + slatW / 2 + 0.02, IN_W / 2 - 0.015].map((x) => (
        <mesh key={x} material={mats.dark} position={[x, HB / 2 + 0.01, z]}>
          <boxGeometry args={[0.03, HB - T - 0.07, T]} />
        </mesh>
      ))}
      {/* lamas */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} material={mats.dark} position={[slatX, 0.085 + i * 0.026, z + 0.004]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[slatW, 0.022, 0.006]} />
        </mesh>
      ))}
      {/* controlador digital */}
      <group position={[0.245, HB / 2 + 0.012, z + 0.004]}>
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

function Door({ mats }: { mats: Mats }) {
  const hinge = useRef<THREE.Group>(null);
  const anim = useAnim();
  useFrame(() => {
    if (hinge.current) hinge.current.rotation.y = anim.current.door * 1.85;
  });
  const f = 0.052;
  const th = 0.045;
  return (
    <Part {...PARTS.door}>
      <group ref={hinge}>
        {/* perfiles del marco */}
        <RoundedBox args={[W, f, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-W / 2, DOOR_H - f / 2, 0]} />
        <RoundedBox args={[W, f, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-W / 2, f / 2, 0]} />
        <RoundedBox args={[f, DOOR_H, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-f / 2, DOOR_H / 2, 0]} />
        <RoundedBox args={[f, DOOR_H, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-W + f / 2, DOOR_H / 2, 0]} />
        {/* burlete magnético */}
        {[DOOR_H - f / 2, f / 2].map((y) => (
          <mesh key={y} material={mats.rubber} position={[-W / 2, y, -th / 2 - 0.006]}>
            <boxGeometry args={[W - 0.03, 0.026, 0.012]} />
          </mesh>
        ))}
        {[-f / 2, -W + f / 2].map((x) => (
          <mesh key={x} material={mats.rubber} position={[x, DOOR_H / 2, -th / 2 - 0.006]}>
            <boxGeometry args={[0.026, DOOR_H - 0.03, 0.012]} />
          </mesh>
        ))}
        {/* doble vidrio */}
        {[-0.011, 0.011].map((z) => (
          <mesh key={z} material={mats.glass} position={[-W / 2, DOOR_H / 2, z]} renderOrder={2}>
            <boxGeometry args={[W - 2 * f + 0.01, DOOR_H - 2 * f + 0.01, 0.005]} />
          </mesh>
        ))}
        <mesh material={mats.alu} position={[-W / 2, f + 0.003, 0]}>
          <boxGeometry args={[W - 2 * f, 0.006, 0.02]} />
        </mesh>
        {/* manija de perfil completo */}
        <RoundedBox args={[0.028, DOOR_H - 0.3, 0.03]} radius={0.008} smoothness={3} material={mats.chrome} position={[-W + 0.03, DOOR_H / 2, th / 2 + 0.017]} />
        {[0.22, DOOR_H - 0.22].map((y) => (
          <mesh key={y} material={mats.chrome} position={[-W + 0.03, y, th / 2 + 0.004]}>
            <boxGeometry args={[0.02, 0.03, 0.012]} />
          </mesh>
        ))}
        {/* pivotes de bisagra */}
        {[-0.012, DOOR_H + 0.012].map((y) => (
          <mesh key={y} material={mats.chrome} position={[-0.02, y, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.03, 16]} />
          </mesh>
        ))}
        {/* imán del sensor de puerta */}
        <RoundedBox args={[0.09, 0.028, 0.016]} radius={0.004} smoothness={2} material={mats.plastic} position={[-W + 0.1, DOOR_H - 0.03, th / 2 + 0.008]} />
      </group>
    </Part>
  );
}

function Shelf({ mats }: { mats: Mats }) {
  const sw = IN_W - 0.035;
  const sd = D - 2 * T - 0.17;
  const wires = 24;
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
      {/* portaprecios */}
      <mesh material={mats.plastic} position={[0, -0.012, sd / 2 + 0.006]}>
        <boxGeometry args={[sw, 0.03, 0.004]} />
      </mesh>
    </group>
  );
}

function Evaporator({ mats }: { mats: Mats }) {
  const fins = 34;
  const width = 0.62;
  const fh = 0.82;
  const cy = -0.12;
  return (
    <Part {...PARTS.evaporator}>
      {/* chapas laterales */}
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
      {/* forzador con ventilador */}
      <group position={[0, 0.44, 0.03]}>
        <RoundedBox args={[0.64, 0.26, 0.05]} radius={0.01} smoothness={2} material={mats.plastic} />
        <mesh material={mats.rubber} position={[0, 0, 0.0255]}>
          <circleGeometry args={[0.105, 32]} />
        </mesh>
        <group position={[0, 0, 0.034]}>
          <Fan r={0.095} mats={mats} />
        </group>
        {[-0.24, 0.24].map((x) =>
          [0, 1, 2, 3].map((i) => (
            <mesh key={`${x}${i}`} material={mats.rubber} position={[x, -0.075 + i * 0.05, 0.0255]}>
              <planeGeometry args={[0.1, 0.018]} />
            </mesh>
          )),
        )}
      </group>
    </Part>
  );
}

function Probe({ mats, alert }: { mats: Mats; alert: boolean }) {
  const color = alert ? "#fb923c" : "#22d3ee";
  const cable = useMemo<Vec3[]>(
    () => [
      [-0.08, 0, 0],
      [-0.12, 0.03, -0.02],
      [-0.14, 0.07, -0.12],
      [-0.14, 0.075, -0.3],
    ],
    [],
  );
  return (
    <Part {...PARTS.probe}>
      <mesh material={mats.chrome} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.011, 0.15, 16]} />
      </mesh>
      <mesh material={mats.rubber} position={[-0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.013, 0.009, 0.03, 14]} />
      </mesh>
      <mesh position={[0.08, 0, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* grampa y cable */}
      <mesh material={mats.plastic} position={[-0.02, 0.016, 0]}>
        <boxGeometry args={[0.03, 0.012, 0.035]} />
      </mesh>
      <Pipe points={cable} r={0.004} material={mats.rubber} />
    </Part>
  );
}

const SUCTION: Vec3[] = [
  [-0.05, 0.2, -0.05],
  [-0.06, 0.26, -0.1],
  [-0.06, 0.28, -0.2],
  [-0.06, 0.285, -0.3],
];
const DISCHARGE: Vec3[] = [
  [0.06, 0.2, -0.05],
  [0.12, 0.25, -0.1],
  [0.24, 0.25, -0.13],
  [0.34, 0.24, -0.14],
];
const PROCESS: Vec3[] = [
  [-0.1, 0.17, 0.05],
  [-0.15, 0.2, 0.08],
  [-0.19, 0.2, 0.1],
];
const POWER: Vec3[] = [
  [0.15, 0.1, 0.02],
  [0.21, 0.09, 0.06],
  [0.27, 0.1, 0.1],
  [0.3, 0.1, 0.02],
  [0.3, 0.08, -0.24],
];
const ACCEL_CABLE: Vec3[] = [
  [0.02, 0.272, 0.04],
  [0.06, 0.25, 0.1],
  [0.14, 0.2, 0.16],
  [0.3, 0.2, 0.2],
];

function Compressor({ mats, locked }: { mats: Mats; locked: boolean }) {
  const shake = useRef<THREE.Group>(null);
  const heat = useRef<THREE.PointLight>(null);
  const body = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0b0d10", metalness: 0.6, roughness: 0.26, emissive: "#ff2a1f", emissiveIntensity: 0 }),
    [],
  );
  const clamp = useMemo(() => {
    const s = new THREE.Shape();
    const a = 0.042;
    s.moveTo(-a, -a);
    s.lineTo(a, -a);
    s.lineTo(a, a);
    s.lineTo(-a, a);
    s.lineTo(-a, -a);
    const hole = new THREE.Path();
    hole.absarc(0, 0.004, 0.02, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.036, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 20 });
    g.translate(0, 0, -0.018);
    return g;
  }, []);
  useEffect(
    () => () => {
      body.dispose();
      clamp.dispose();
    },
    [body, clamp],
  );

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
    const target = locked ? 1.3 + Math.sin(t * 6) * 0.6 : 0;
    body.emissiveIntensity = THREE.MathUtils.damp(body.emissiveIntensity, target, 6, dt);
    if (heat.current) heat.current.intensity = body.emissiveIntensity * 1.6;
  });

  return (
    <Part {...PARTS.compressor}>
      {/* bandeja */}
      <mesh material={mats.steel} position={[0.14, 0.006, 0]}>
        <boxGeometry args={[0.68, 0.012, 0.56]} />
      </mesh>

      <group ref={shake}>
        {/* carcasa hermética */}
        <mesh material={body} position={[0, 0.095, 0]}>
          <cylinderGeometry args={[0.125, 0.13, 0.13, 40]} />
        </mesh>
        <mesh material={body} position={[0, 0.16, 0]} scale={[1, 0.82, 1]}>
          <sphereGeometry args={[0.125, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={body} position={[0, 0.03, 0]} scale={[1, 0.3, 1]}>
          <sphereGeometry args={[0.13, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
        <mesh material={mats.black} position={[0, 0.158, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.127, 0.007, 8, 40]} />
        </mesh>
        {/* patas con tacos antivibratorios */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <group key={`${sx}${sz}`} position={[sx * 0.13, 0, sz * 0.1]}>
              <mesh material={mats.black} position={[-sx * 0.02, 0.04, 0]}>
                <boxGeometry args={[0.07, 0.006, 0.045]} />
              </mesh>
              <mesh material={mats.rubber} position={[0, 0.024, 0]}>
                <cylinderGeometry args={[0.018, 0.02, 0.026, 14]} />
              </mesh>
              <mesh material={mats.chrome} position={[0, 0.048, 0]}>
                <cylinderGeometry args={[0.009, 0.009, 0.012, 6]} />
              </mesh>
            </group>
          )),
        )}
        {/* tapa de bornes y relé */}
        <RoundedBox args={[0.055, 0.085, 0.085]} radius={0.008} smoothness={2} material={mats.black} position={[0.135, 0.1, 0.01]} />
        <mesh material={mats.plastic} position={[0.165, 0.1, 0.01]}>
          <boxGeometry args={[0.004, 0.04, 0.05]} />
        </mesh>
        {/* cañerías */}
        <Pipe points={SUCTION} r={0.011} material={mats.copper} />
        <Pipe points={DISCHARGE} r={0.007} material={mats.copper} />
        <Pipe points={PROCESS} r={0.006} material={mats.copper} />
        {/* acelerómetro sobre la carcasa */}
        <group position={[0, 0.268, 0.02]}>
          <mesh material={mats.pcb}>
            <boxGeometry args={[0.06, 0.006, 0.045]} />
          </mesh>
          <mesh material={mats.black} position={[0.004, 0.006, 0]}>
            <boxGeometry args={[0.016, 0.006, 0.016]} />
          </mesh>
          <mesh position={[0.02, 0.005, 0.014]}>
            <boxGeometry args={[0.006, 0.004, 0.004]} />
            <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
        </group>
        <pointLight ref={heat} position={[0, 0.22, 0.12]} color="#ff5a2a" intensity={0} distance={1.2} />
      </group>
      <Pipe points={ACCEL_CABLE} r={0.004} material={mats.rubber} />

      {/* alimentación con pinza amperométrica */}
      <Pipe points={POWER} r={0.008} material={mats.rubber} />
      <group position={[0.27, 0.1, 0.1]} rotation={[0, 0.9, 0]}>
        <mesh geometry={clamp} material={mats.blue} />
        <mesh material={mats.black} position={[0, 0.022, 0]}>
          <boxGeometry args={[0.094, 0.002, 0.045]} />
        </mesh>
      </group>

      {/* condensador con ventilador */}
      <group position={[0.36, 0.16, -0.13]}>
        {Array.from({ length: 16 }).map((_, i) => (
          <mesh key={i} material={mats.alu} position={[-0.075 + i * 0.01, 0, 0]}>
            <boxGeometry args={[0.002, 0.24, 0.1]} />
          </mesh>
        ))}
        {[-0.08, -0.03, 0.02, 0.07].flatMap((y) =>
          [-0.025, 0.025].map((z) => (
            <mesh key={`${y}${z}`} material={mats.copper} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.006, 0.006, 0.18, 8]} />
            </mesh>
          )),
        )}
        <group position={[0, 0, 0.12]}>
          <mesh material={mats.black} position={[0, 0, -0.03]}>
            <boxGeometry args={[0.2, 0.24, 0.012]} />
          </mesh>
          <Fan r={0.085} mats={mats} speed={11} />
        </group>
      </group>
    </Part>
  );
}

const IOT_CABLES: Vec3[][] = [
  [
    [-0.012, -0.135, 0.03],
    [-0.02, -0.2, 0.03],
    [-0.028, -0.3, 0.02],
  ],
  [
    [-0.012, -0.135, -0.03],
    [-0.02, -0.2, -0.035],
    [-0.028, -0.3, -0.05],
  ],
];

function IotModule({ mats }: { mats: Mats }) {
  return (
    <Part {...PARTS.iot}>
      <RoundedBox args={[0.06, 0.22, 0.16]} radius={0.012} smoothness={3} material={mats.box} />
      <RoundedBox args={[0.012, 0.21, 0.15]} radius={0.005} smoothness={2} material={mats.frame} position={[0.032, 0, 0]} />
      <mesh position={[0.0255, 0, 0]}>
        <boxGeometry args={[0.004, 0.214, 0.154]} />
        <meshStandardMaterial color="#0e7490" emissive="#2dd4bf" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <mesh position={[0.039, 0.075, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.005, 0.02, 4, 10]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={3.2} toneMapped={false} />
      </mesh>
      {/* prensacables y cables */}
      {[-0.03, 0.03].map((z) => (
        <mesh key={z} material={mats.rubber} position={[-0.01, -0.122, z]}>
          <cylinderGeometry args={[0.014, 0.016, 0.026, 6]} />
        </mesh>
      ))}
      {IOT_CABLES.map((c, i) => (
        <Pipe key={i} points={c} r={0.006} material={mats.rubber} />
      ))}
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


/** Avisa cuando la escena ya dibujó sus primeros cuadros. */
function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) onReady();
  });
  return null;
}

function Scene({
  telemetry,
  xray,
  exploded,
  focus,
  onSelect,
  modelUrl,
  overlay,
  onReady,
}: {
  telemetry: EquipmentTelemetry;
  xray: boolean;
  exploded: boolean;
  focus: HotspotId | null;
  onSelect: (id: HotspotId) => void;
  modelUrl?: string;
  overlay: HTMLDivElement | null;
  onReady: () => void;
}) {
  const tex = useTextures(fmt(telemetry.temperatura), telemetry.temperatura > 8);
  const mats = useMaterials(tex.grain);
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
      <fog attach="fog" args={["#16203a", 10, 24]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[-3.5, 6.5, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={4}
        shadow-camera-bottom={-1.5}
        shadow-camera-near={1}
        shadow-camera-far={18}
      />
      <pointLight position={[3, 2, -2.5]} intensity={16} color="#38bdf8" />
      <pointLight position={[-3, 1, 3]} intensity={5} color="#93c5fd" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} position={[0, 6, 1]} scale={[9, 4, 1]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={2} position={[-5, 2.5, 2]} scale={[4, 7, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.3} position={[5, 2, 2]} scale={[3, 7, 1]} rotation={[0, -Math.PI / 2, 0]} color="#bfdbfe" />
        <Lightformer form="rect" intensity={1.6} position={[0, 2, 6]} scale={[8, 4, 1]} rotation={[0, Math.PI, 0]} />
      </Environment>

      {modelUrl ? (
        <Suspense fallback={null}>
          <GltfModel url={modelUrl} />
        </Suspense>
      ) : (
        <group>
          <Shadows>
            <Cabinet mats={mats} />
            <Canopy mats={mats} tex={tex} doorOpen={doorOpen} flag={contradiction} />
            <BaseGrille mats={mats} tex={tex} />
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
          </Shadows>
          <AirFlow />
          {overlay &&
            hotspots.map((h) => <Hotspot key={h.id} def={h} active={focus === h.id} onSelect={onSelect} portal={portal} />)}
        </group>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.062, 0]} receiveShadow material={mats.floor}>
        <planeGeometry args={[60, 60]} />
      </mesh>
      <Grid position={[0, -0.059, 0]} infiniteGrid cellSize={0.25} sectionSize={1} cellColor="#1e3a5f" sectionColor="#2b5b8a" fadeDistance={14} fadeStrength={2.2} />
      <CameraRig focus={focus} exploded={exploded} />
      <Ready onReady={onReady} />
      <EffectComposer>
        <N8AO aoRadius={0.3} intensity={2.4} distanceFalloff={1} quality="medium" />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, isFallbackFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const [local, setLocal] = useState(telemetry);
  const [xray, setXray] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [focus, setFocus] = useState<HotspotId | null>(null);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const clearFocus = useCallback(() => setFocus(null), []);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

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
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gradient-to-b from-[#0F172A] to-[#1E293B] ${
        isFallbackFullscreen
          ? "fixed inset-0 z-50 h-dvh w-screen rounded-none"
          : isFullscreen
            ? "h-full w-full rounded-none"
            : `h-full min-h-[520px] w-full rounded-xl ${className}`
      }`}
    >
      <Canvas shadows dpr={DPR} camera={CAMERA} onPointerMissed={clearFocus}>
        <Scene telemetry={local} xray={xray} exploded={exploded} focus={focus} onSelect={selectHotspot} modelUrl={modelUrl} overlay={overlay} onReady={markReady} />
      </Canvas>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Cargando modelo 3D…
        </div>
      )}
      {/* capa donde se montan las etiquetas flotantes */}
      <div ref={setOverlay} className="pointer-events-none absolute inset-0 isolate overflow-hidden" />

      {/* Título */}
      <div className="pointer-events-none absolute left-5 top-4">
        <h3 className="text-lg font-medium text-slate-100">{equipmentName}</h3>
        <p className="text-xs text-slate-400">Simulación 3D</p>
      </div>

      {/* Toggles */}
      <div className="absolute left-1/2 top-14 sm:top-4 flex -translate-x-1/2 items-center divide-x divide-white/10 rounded-full border border-white/15 bg-slate-900/70 backdrop-blur">
        <Toggle label="Modo Rayos X" checked={xray} onChange={setXray} />
        <Toggle label="Vista Explotada" checked={exploded} onChange={setExploded} />
      </div>

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isFullscreen ? "Salir" : "Pantalla completa"}</span>
      </button>

      {/* Panel de telemetría */}
      <div className="absolute right-4 top-24 sm:top-16 w-56 rounded-xl border border-white/10 bg-slate-900/75 p-3 backdrop-blur">
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
