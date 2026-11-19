import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, ReactNode, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Environment, Grid, Html, Lightformer, RoundedBox, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { Activity, AlertTriangle, CheckCircle2, DoorOpen, Droplets, Maximize2, Minimize2, RotateCcw, Snowflake, Thermometer, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";
import {
  AnimCtx,
  ChestBasket,
  ChestCabinet,
  ChestCollar,
  ChestEvaporator,
  ChestMachineGrille,
  ChestSlidingLids,
  DOOR_H,
  DoubleDoors,
  Fan,
  getVariantConfig,
  Part,
  Pipe,
  resolveVariant,
  SHELF_Y,
  shelfOffset,
  UprightBaseGrille,
  UprightCabinet,
  UprightCanopy,
  UprightEvaporator,
  UprightShelf,
  useAnim,
  VariantAirFlow,
} from "@/components/three/EquipmentVariants3D";
import type { Anim, EquipmentVariant, HotspotId, VariantConfig, VariantMats, VariantTextures, Vec3 } from "@/components/three/EquipmentVariants3D";

export type { EquipmentVariant };

export type EquipmentTelemetry = {
  temperatura: number;
  tempEvaporador?: number;
  tempAmbiente?: number;
  humedad: number;
  estadoPuerta: "abierta" | "cerrada";
  corriente: number;
  vibracion: "normal" | "alta";
};

export type EquipmentSimulator3DProps = {
  equipmentName: string;
  telemetry: EquipmentTelemetry;
  onTelemetryChange?: (next: EquipmentTelemetry) => void;
  variant?: EquipmentVariant;
  modelUrl?: string;
  className?: string;
};

const SCENARIOS: { id: string; label: string; telemetry: EquipmentTelemetry }[] = [
  { id: "optimo", label: "Óptimo", telemetry: { temperatura: 3.2, tempEvaporador: -10.5, tempAmbiente: 24.5, humedad: 45, estadoPuerta: "cerrada", corriente: 2.8, vibracion: "normal" } },
  { id: "fuga", label: "Fuga de Gas", telemetry: { temperatura: 12.8, tempEvaporador: 24.5, tempAmbiente: 26.0, humedad: 55, estadoPuerta: "cerrada", corriente: 1.1, vibracion: "normal" } },
  { id: "puerta", label: "Puerta Abierta", telemetry: { temperatura: 9.5, tempEvaporador: -6.0, tempAmbiente: 25.0, humedad: 78, estadoPuerta: "abierta", corriente: 3.1, vibracion: "normal" } },
  { id: "trabado", label: "Compresor Trabado", telemetry: { temperatura: 11.2, tempEvaporador: 22.0, tempAmbiente: 28.0, humedad: 60, estadoPuerta: "cerrada", corriente: 16.5, vibracion: "alta" } },
  { id: "contradiccion", label: "Contradicción de Sensores", telemetry: { temperatura: 12.0, tempEvaporador: -15.0, tempAmbiente: 29.0, humedad: 85, estadoPuerta: "cerrada", corriente: 2.9, vibracion: "normal" } },
];

function diagnose(t: EquipmentTelemetry) {
  const evapTemp = t.tempEvaporador ?? -10.5;
  const doorOpen = t.estadoPuerta === "abierta";
  const locked = t.corriente > 10 && t.vibracion === "alta";
  const contradiction = !doorOpen && !locked && t.temperatura > 8 && t.humedad > 75;
  const gasLeak = !doorOpen && !locked && !contradiction && evapTemp > 0 && t.temperatura > 8;
  return { doorOpen, locked, contradiction, gasLeak };
}

const sameTelemetry = (a: EquipmentTelemetry, b: EquipmentTelemetry) =>
  a.temperatura === b.temperatura &&
  (a.tempEvaporador ?? -10.5) === (b.tempEvaporador ?? -10.5) &&
  a.humedad === b.humedad &&
  a.estadoPuerta === b.estadoPuerta &&
  a.corriente === b.corriente &&
  a.vibracion === b.vibracion;

const fmt = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

const W = 0.8;
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

function useTextures(tempText: string, tempAlert: boolean): VariantTextures {
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

function useMaterials(grain: THREE.Texture): VariantMats {
  return useMemo(() => {
    const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
    const glass = std({ color: "#bfe3ff", metalness: 0.15, roughness: 0.03, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 1.6 });
    glass.userData.noShadow = true;
    return {
      shell: std({ color: "#eef1f4", metalness: 0.18, roughness: 0.4, roughnessMap: grain, bumpMap: grain, bumpScale: 0.12, transparent: true }),
      liner: std({ color: "#f8fafb", metalness: 0.02, roughness: 0.55, transparent: true }),
      dark: std({ color: "#1a1f27", metalness: 0.45, roughness: 0.5, transparent: true }),
      edge: new THREE.LineBasicMaterial({ color: new THREE.Color(0.7, 1.5, 2.2), transparent: true, opacity: 0, toneMapped: false }),
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

function Driver({ targets, mats }: { targets: Anim; mats: VariantMats }) {
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

function SingleDoor({ mats, part }: { mats: VariantMats; part: { base: Vec3; offset: Vec3 } }) {
  const hinge = useRef<THREE.Group>(null);
  const anim = useAnim();
  useFrame(() => {
    if (hinge.current) hinge.current.rotation.y = anim.current.door * 1.85;
  });
  const f = 0.052;
  const th = 0.045;
  return (
    <Part {...part}>
      <group ref={hinge}>
        <RoundedBox args={[W, f, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-W / 2, DOOR_H - f / 2, 0]} />
        <RoundedBox args={[W, f, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-W / 2, f / 2, 0]} />
        <RoundedBox args={[f, DOOR_H, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-f / 2, DOOR_H / 2, 0]} />
        <RoundedBox args={[f, DOOR_H, th]} radius={0.008} smoothness={3} material={mats.frame} position={[-W + f / 2, DOOR_H / 2, 0]} />
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
        {[-0.011, 0.011].map((z) => (
          <mesh key={z} material={mats.glass} position={[-W / 2, DOOR_H / 2, z]} renderOrder={2}>
            <boxGeometry args={[W - 2 * f + 0.01, DOOR_H - 2 * f + 0.01, 0.005]} />
          </mesh>
        ))}
        <mesh material={mats.alu} position={[-W / 2, f + 0.003, 0]}>
          <boxGeometry args={[W - 2 * f, 0.006, 0.02]} />
        </mesh>
        <RoundedBox args={[0.028, DOOR_H - 0.3, 0.03]} radius={0.008} smoothness={3} material={mats.chrome} position={[-W + 0.03, DOOR_H / 2, th / 2 + 0.017]} />
        {[0.22, DOOR_H - 0.22].map((y) => (
          <mesh key={y} material={mats.chrome} position={[-W + 0.03, y, th / 2 + 0.004]}>
            <boxGeometry args={[0.02, 0.03, 0.012]} />
          </mesh>
        ))}
        {[-0.012, DOOR_H + 0.012].map((y) => (
          <mesh key={y} material={mats.chrome} position={[-0.02, y, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.03, 16]} />
          </mesh>
        ))}
        <RoundedBox args={[0.09, 0.028, 0.016]} radius={0.004} smoothness={2} material={mats.plastic} position={[-W + 0.1, DOOR_H - 0.03, th / 2 + 0.008]} />
      </group>
    </Part>
  );
}

function Probe({ mats, alert, part }: { mats: VariantMats; alert: boolean; part: { base: Vec3; offset: Vec3 } }) {
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
    <Part {...part}>
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
      <mesh material={mats.plastic} position={[-0.02, 0.016, 0]}>
        <boxGeometry args={[0.03, 0.012, 0.035]} />
      </mesh>
      <Pipe points={cable} r={0.004} material={mats.rubber} />
    </Part>
  );
}

function Ds18b20Probe({ mats, alert, part }: { mats: VariantMats; alert: boolean; part: { base: Vec3; offset: Vec3 } }) {
  const color = alert ? "#fb923c" : "#38bdf8";
  const evapCable = useMemo<Vec3[]>(
    () => [
      [0, -0.055, 0.01],
      [-0.03, -0.11, -0.01],
      [-0.05, -0.16, -0.04],
      [-0.05, -0.22, -0.06],
    ],
    [],
  );
  return (
    <Part {...part}>
      <mesh material={mats.chrome} position={[0, 0.02, 0.01]}>
        <cylinderGeometry args={[0.009, 0.009, 0.11, 18]} />
      </mesh>
      <mesh position={[0, 0.075, 0.01]}>
        <sphereGeometry args={[0.0095, 16, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
      <mesh material={mats.rubber} position={[0, -0.04, 0.01]}>
        <cylinderGeometry args={[0.011, 0.008, 0.028, 14]} />
      </mesh>
      <mesh material={mats.blue} position={[0, -0.035, 0.01]}>
        <cylinderGeometry args={[0.0115, 0.0115, 0.01, 14]} />
      </mesh>
      <mesh material={mats.copper} position={[-0.012, 0.02, 0.002]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.014, 0.028, 0.022]} />
      </mesh>
      <Pipe points={evapCable} r={0.0035} material={mats.rubber} />
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

function Compressor({
  mats,
  locked,
  part,
  scale = 1,
}: {
  mats: VariantMats;
  locked: boolean;
  part: { base: Vec3; offset: Vec3 };
  scale?: number;
}) {
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
    <Part {...part}>
      <group scale={scale}>
        <mesh material={mats.steel} position={[0.14, 0.006, 0]}>
          <boxGeometry args={[0.68, 0.012, 0.56]} />
        </mesh>

        <group ref={shake}>
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
          <RoundedBox args={[0.055, 0.085, 0.085]} radius={0.008} smoothness={2} material={mats.black} position={[0.135, 0.1, 0.01]} />
          <mesh material={mats.plastic} position={[0.165, 0.1, 0.01]}>
            <boxGeometry args={[0.004, 0.04, 0.05]} />
          </mesh>
          <Pipe points={SUCTION} r={0.011} material={mats.copper} />
          <Pipe points={DISCHARGE} r={0.007} material={mats.copper} />
          <Pipe points={PROCESS} r={0.006} material={mats.copper} />
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

        <Pipe points={POWER} r={0.008} material={mats.rubber} />
        <group position={[0.27, 0.1, 0.1]} rotation={[0, 0.9, 0]}>
          <mesh geometry={clamp} material={mats.blue} />
          <mesh material={mats.black} position={[0, 0.022, 0]}>
            <boxGeometry args={[0.094, 0.002, 0.045]} />
          </mesh>
        </group>

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

function IotModule({ mats, part }: { mats: VariantMats; part: { base: Vec3; offset: Vec3 } }) {
  return (
    <Part {...part}>
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

type HotspotDef = { id: HotspotId; n: number; label: string; value: string; alert: boolean };

const Z_RANGE: [number, number] = [30, 0];

function Hotspot({
  def,
  cfg,
  active,
  onSelect,
  portal,
}: {
  def: HotspotDef;
  cfg: VariantConfig;
  active: boolean;
  onSelect: (id: HotspotId) => void;
  portal: RefObject<HTMLElement>;
}) {
  const a = cfg.hotspots[def.id];
  const part = cfg.parts[a.part];
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

const CAMERA = { position: [2.5, 1.85, 3.5] as Vec3, fov: 36 };
const DPR: [number, number] = [1, 1.75];

function CameraRig({ focus, exploded, cfg }: { focus: HotspotId | null; exploded: boolean; cfg: VariantConfig }) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (!focus) {
      const v = exploded ? cfg.explodedView : cfg.defaultView;
      c.setLookAt(...v.pos, ...v.target, true);
      return;
    }
    const a = cfg.hotspots[focus];
    const p = cfg.parts[a.part];
    const e = exploded ? 1 : 0;
    const target: Vec3 = [p.base[0] + p.offset[0] * e + a.local[0], p.base[1] + p.offset[1] * e + a.local[1], p.base[2] + p.offset[2] * e + a.local[2]];
    c.setLookAt(target[0] + a.cam[0], target[1] + a.cam[1], target[2] + a.cam[2], ...target, true);
  }, [focus, exploded, cfg]);
  return <CameraControls ref={controls} makeDefault minDistance={1} maxDistance={10} maxPolarAngle={Math.PI / 2.02} smoothTime={0.35} />;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

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
  variant,
  xray,
  exploded,
  focus,
  onSelect,
  modelUrl,
  overlay,
  onReady,
}: {
  telemetry: EquipmentTelemetry;
  variant: EquipmentVariant;
  xray: boolean;
  exploded: boolean;
  focus: HotspotId | null;
  onSelect: (id: HotspotId) => void;
  modelUrl?: string;
  overlay: HTMLDivElement | null;
  onReady: () => void;
}) {
  const cfg = useMemo(() => getVariantConfig(variant), [variant]);
  const tex = useTextures(fmt(telemetry.temperatura), telemetry.temperatura > 8);
  const mats = useMaterials(tex.grain);
  const anim = useRef<Anim>({ explode: 0, xray: 0, door: 0 });
  const portal = useMemo(() => ({ current: overlay }) as RefObject<HTMLElement>, [overlay]);
  const targets = useMemo<Anim>(() => ({ explode: 0, xray: 0, door: 0 }), []);
  const { doorOpen, locked, contradiction, gasLeak } = diagnose(telemetry);
  const evapTemp = telemetry.tempEvaporador ?? -10.5;
  const ambTemp = telemetry.tempAmbiente ?? 24.5;
  const evapAlert = evapTemp > 0 || gasLeak;
  targets.explode = exploded ? 1 : 0;
  targets.xray = xray ? 1 : 0;
  targets.door = doorOpen ? 1 : 0;

  const hotspots: HotspotDef[] = [
    { id: "temperatura", n: 1, label: "Sonda interior (SHT31)", value: `${fmt(telemetry.temperatura)} °C`, alert: contradiction || telemetry.temperatura > 8 },
    { id: "tempEvaporador", n: 2, label: "Sondas DS18B20 (Evap. / Amb.)", value: `${fmt(evapTemp)} °C / ${fmt(ambTemp)} °C`, alert: evapAlert },
    { id: "humedad", n: 3, label: "Evaporador y flujo de aire", value: `${fmt(telemetry.humedad, 0)} %`, alert: contradiction },
    { id: "estadoPuerta", n: 4, label: "Sensor magnético de puerta", value: doorOpen ? "Abierta" : "Cerrada", alert: doorOpen || contradiction },
    { id: "corriente", n: 5, label: "Pinza amperométrica", value: `${fmt(telemetry.corriente)} A`, alert: telemetry.corriente > 10 },
    { id: "vibracion", n: 6, label: "Acelerómetro del compresor", value: telemetry.vibracion === "alta" ? "Alta" : "Normal", alert: telemetry.vibracion === "alta" },
  ];

  const uprightDoors: 1 | 2 = variant === "double" ? 2 : 1;

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
            {variant === "chest" ? (
              <>
                <ChestCabinet mats={mats} />
                <ChestCollar mats={mats} tex={tex} doorOpen={doorOpen} flag={contradiction} part={cfg.parts.canopy} />
                <ChestMachineGrille mats={mats} tex={tex} part={cfg.parts.grille} />
                <ChestSlidingLids mats={mats} part={cfg.parts.door} />
                {[0, 1, 2].map((i) => (
                  <ChestBasket key={i} mats={mats} index={i} />
                ))}
                <ChestEvaporator mats={mats} part={cfg.parts.evaporator} />
              </>
            ) : (
              <>
                <UprightCabinet mats={mats} doors={uprightDoors} />
                <UprightCanopy mats={mats} tex={tex} doorOpen={doorOpen} flag={contradiction} part={cfg.parts.canopy} doors={uprightDoors} />
                <UprightBaseGrille mats={mats} tex={tex} part={cfg.parts.grille} doors={uprightDoors} />
                {variant === "double" ? (
                  <DoubleDoors mats={mats} part={cfg.parts.door} />
                ) : (
                  <SingleDoor mats={mats} part={cfg.parts.door} />
                )}
                {SHELF_Y.map((y, i) => (
                  <Part key={y} base={[0, y, 0]} offset={shelfOffset(i)}>
                    <UprightShelf mats={mats} doors={uprightDoors} />
                  </Part>
                ))}
                <UprightEvaporator mats={mats} part={cfg.parts.evaporator} doors={uprightDoors} />
              </>
            )}
            <Probe mats={mats} alert={contradiction} part={cfg.parts.probe} />
            <Ds18b20Probe mats={mats} alert={evapAlert} part={cfg.parts.ds18b20} />
            <Compressor mats={mats} locked={locked} part={cfg.parts.compressor} scale={variant === "chest" ? 0.8 : 1} />
            <IotModule mats={mats} part={cfg.parts.iot} />
          </Shadows>
          <VariantAirFlow variant={variant} />
          {overlay &&
            hotspots.map((h) => <Hotspot key={h.id} def={h} cfg={cfg} active={focus === h.id} onSelect={onSelect} portal={portal} />)}
        </group>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.062, 0]} receiveShadow material={mats.floor}>
        <planeGeometry args={[60, 60]} />
      </mesh>
      <Grid position={[0, -0.059, 0]} infiniteGrid cellSize={0.25} sectionSize={1} cellColor="#1e3a5f" sectionColor="#2b5b8a" fadeDistance={14} fadeStrength={2.2} />
      <CameraRig focus={focus} exploded={exploded} cfg={cfg} />
      <Ready onReady={onReady} />
      <EffectComposer>
        <N8AO aoRadius={0.3} intensity={2.4} distanceFalloff={1} quality="medium" />
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
      </EffectComposer>
    </AnimCtx.Provider>
  );
}

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
  { id: "temperatura", label: "Temp. interior", icon: Thermometer },
  { id: "tempEvaporador", label: "Evap. / Amb.", icon: Snowflake },
  { id: "humedad", label: "Humedad", icon: Droplets },
  { id: "estadoPuerta", label: "Puerta", icon: DoorOpen },
  { id: "corriente", label: "Corriente", icon: Zap },
  { id: "vibracion", label: "Vibración", icon: Activity },
];

export function EquipmentSimulator3D({
  equipmentName,
  telemetry,
  onTelemetryChange,
  variant: explicitVariant,
  modelUrl,
  className = "",
}: EquipmentSimulator3DProps) {
  const variant = useMemo(() => resolveVariant(equipmentName, explicitVariant), [equipmentName, explicitVariant]);
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

  const { doorOpen, locked, contradiction, gasLeak } = diagnose(local);
  const evapTemp = local.tempEvaporador ?? -10.5;
  const ambTemp = local.tempAmbiente ?? 24.5;
  const alert = locked
    ? { title: "Compresor trabado", text: "Sobrecorriente con vibración alta. Cortar alimentación y revisar el compresor." }
    : gasLeak
      ? { title: "Posible fuga de gas", text: "Sonda DS18B20 detecta evaporador sin frío (> 0 °C) con temperatura interior elevada." }
      : doorOpen
        ? { title: "Puerta abierta", text: "El aire frío se está escapando del gabinete." }
        : contradiction
          ? { title: "Verificación visual requerida", text: "Temperatura y humedad altas con la puerta informada como cerrada." }
          : null;

  const values: Record<HotspotId, { text: string; alert: boolean }> = {
    temperatura: { text: `${fmt(local.temperatura)} °C`, alert: local.temperatura > 8 },
    tempEvaporador: { text: `${fmt(evapTemp)} / ${fmt(ambTemp)} °C`, alert: evapTemp > 0 },
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
        <Scene telemetry={local} variant={variant} xray={xray} exploded={exploded} focus={focus} onSelect={selectHotspot} modelUrl={modelUrl} overlay={overlay} onReady={markReady} />
      </Canvas>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Cargando modelo 3D…
        </div>
      )}
      <div ref={setOverlay} className="pointer-events-none absolute inset-0 isolate overflow-hidden" />

      <div className="pointer-events-none absolute left-5 top-4">
        <h3 className="text-lg font-medium text-slate-100">{equipmentName}</h3>
        <p className="text-xs text-slate-400">Simulación 3D</p>
      </div>

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

      {alert && (
        <div className="absolute bottom-20 left-5 max-w-xs rounded-xl border border-amber-400/40 bg-slate-900/80 p-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {alert.title}
          </div>
          <p className="mt-1 text-xs text-slate-300">{alert.text}</p>
        </div>
      )}

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
