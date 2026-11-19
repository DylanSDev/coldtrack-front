import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, ReactNode, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { CameraControls, Environment, Grid, Html, Lightformer, RoundedBox, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { Activity, Cpu, DoorClosed, Droplets, Maximize2, Minimize2, Thermometer, X, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

export type SensorId = "esp32" | "sht31" | "ds18b20" | "reed" | "sct013" | "mpu6050";

export type ColdTrackSensor3DProps = {
  activeSensor?: SensorId | null;
  onSelectSensor?: (id: SensorId | null) => void;
  telemetryStatus?: "ok" | "warning" | "error";
  modelUrl?: string;
  className?: string;
};

type Vec3 = [number, number, number];
type Status = "ok" | "warning" | "error";

const SENSOR_INFO: Record<
  SensorId,
  { n: number; name: string; model: string; bus: string; icon: LucideIcon; mide: string; conexion: string; falla: string }
> = {
  sht31: {
    n: 1,
    name: "Sensor de temperatura y humedad",
    model: "SHT31 / DHT22",
    bus: "Bus I2C",
    icon: Droplets,
    mide: "Temperatura interior (°C) y humedad relativa (%).",
    conexion: "I2C: SDA en GPIO 21, SCL en GPIO 22 (dirección 0x44).",
    falla: "Pérdida de frío, ingreso de humedad o burletes dañados.",
  },
  ds18b20: {
    n: 2,
    name: "Sondas de evaporador y ambiente",
    model: "DS18B20 (×2)",
    bus: "Bus 1-Wire",
    icon: Thermometer,
    mide: "Temperatura de serpentina evaporadora (°C) y ambiente exterior (°C).",
    conexion: "1-Wire: datos en GPIO 4 con resistencia pull-up de 4,7 kΩ a 3,3 V.",
    falla: "Fuga de gas refrigerante (evaporador > 0 °C) o bloqueo por hielo.",
  },
  reed: {
    n: 3,
    name: "Sensor magnético de puerta",
    model: "Reed Switch",
    bus: "Entrada digital",
    icon: DoorClosed,
    mide: "Estado de la puerta: abierta o cerrada.",
    conexion: "GPIO 27 como entrada digital con pull-up interno.",
    falla: "Puerta abierta o mal cerrada por tiempo prolongado.",
  },
  sct013: {
    n: 4,
    name: "Pinza amperométrica",
    model: "SCT-013",
    bus: "Entrada analógica",
    icon: Zap,
    mide: "Corriente del compresor (A), sin cortar el cable.",
    conexion: "ADC1: GPIO 34, con resistencia de carga y tensión de referencia.",
    falla: "Compresor trabado (sobrecorriente) o que no arranca.",
  },
  mpu6050: {
    n: 5,
    name: "Acelerómetro / vibración",
    model: "MPU-6050",
    bus: "Bus I2C",
    icon: Activity,
    mide: "Vibración del compresor en tres ejes.",
    conexion: "I2C: SDA en GPIO 21, SCL en GPIO 22 (dirección 0x68).",
    falla: "Desbalance, soportes flojos o compresor trabado.",
  },
  esp32: {
    n: 6,
    name: "Microcontrolador",
    model: "ESP32-WROOM-32",
    bus: "Wi-Fi 2,4 GHz",
    icon: Cpu,
    mide: "Concentra los parámetros del equipo y los transmite por Wi-Fi (MQTT).",
    conexion: "Alimentación 5 V por USB. Buses I2C, 1-Wire, ADC1 y GPIO hacia los sensores.",
    falla: "Pérdida de conectividad o reinicios del nodo.",
  },
};

const SENSOR_ORDER: SensorId[] = ["sht31", "ds18b20", "reed", "sct013", "mpu6050", "esp32"];
const STATUS_COLOR = { ok: "#34d399", warning: "#fbbf24", error: "#f87171" } as const;
const STATUS_LABEL = { ok: "Operativo", warning: "Con advertencias", error: "Con fallas" } as const;

const BW = 1.5;
const BH = 0.42;
const BD = 1.0;
const WALL = 0.05;
const CORNER = 0.09;
const GLAND_X = [-0.54, -0.27, 0, 0.27, 0.54];
const GLAND_Y = 0.2;
const CABLE_R = 0.027;

const BOARD_Y = 0.135;
const BOARD_Z = -0.08;
const PIN_X0 = -0.32;
const PIN_STEP = 0.04;

const SHT_POS: Vec3 = [-1.85, 0.064, 1.4];
const DS18_POS: Vec3 = [-1.05, 0.042, 1.72];
const MPU_POS: Vec3 = [-0.15, 0.012, 1.62];
const SCT_POS: Vec3 = [0.9, 0.2, 1.5];
const REED_POS: Vec3 = [1.75, 0.055, 0.55];
const SENSOR_POS: Record<Exclude<SensorId, "esp32">, Vec3> = {
  sht31: SHT_POS,
  ds18b20: DS18_POS,
  mpu6050: MPU_POS,
  sct013: SCT_POS,
  reed: REED_POS,
};

const DPR: [number, number] = [1, 1.75];
const Z_RANGE: [number, number] = [30, 0];
const VIEWS: Record<SensorId | "default", { pos: Vec3; target: Vec3 }> = {
  default: { pos: [2.75, 3.0, 5.0], target: [0, 0.15, 0.7] },
  esp32: { pos: [0.5, 1.55, 0.8], target: [0, 0.14, 0.02] },
  sht31: { pos: [-1.25, 1.1, 2.45], target: [-1.7, 0.05, 1.05] },
  ds18b20: { pos: [-0.75, 0.85, 2.75], target: DS18_POS },
  mpu6050: { pos: [0.15, 0.75, 2.6], target: MPU_POS },
  sct013: { pos: [1.55, 0.95, 2.7], target: SCT_POS },
  reed: { pos: [2.7, 0.9, 1.6], target: REED_POS },
};
const CAMERA = { position: VIEWS.default.pos, fov: 34 };

const CALLOUTS: Record<SensorId, { at: Vec3; side: "left" | "right" }> = {
  sht31: { at: [-1.8, 0.16, 1.35], side: "left" },
  ds18b20: { at: [-1.12, 0.13, 1.78], side: "left" },
  mpu6050: { at: [-0.18, 0.06, 1.7], side: "left" },
  sct013: { at: [1.02, 0.04, 1.72], side: "right" },
  reed: { at: [1.9, 0.11, 0.5], side: "right" },
  esp32: { at: [0.5, 0.2, BOARD_Z], side: "right" },
};

// ---------------------------------------------------------------------------
// Utilidades de geometría y texturas
// ---------------------------------------------------------------------------
function rrect<T extends THREE.Path>(ctx: T, w: number, h: number, r: number): T {
  const x = -w / 2;
  const y = -h / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  ctx.lineTo(x + w, y + h - r);
  ctx.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  ctx.lineTo(x + r, y + h);
  ctx.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  ctx.lineTo(x, y + r);
  ctx.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return ctx;
}

/** Placa o marco de esquinas redondeadas, apoyado en XZ y con espesor hacia +Y. */
function slabGeometry(w: number, d: number, r: number, height: number, inset = 0, bevel = 0) {
  const shape = rrect(new THREE.Shape(), w, d, r);
  if (inset > 0) shape.holes.push(rrect(new THREE.Path(), w - 2 * inset, d - 2 * inset, Math.max(r - inset, 0.01)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

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

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function useTextures() {
  const tex = useMemo(() => {
    // Grano del plástico inyectado
    const grain = canvasTexture(256, 256, (ctx) => {
      const rnd = lcg(7);
      const img = ctx.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 150 + rnd() * 80;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
    grain.colorSpace = THREE.NoColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(7, 7);

    const lid = canvasTexture(512, 128, (ctx) => {
      ctx.font = `600 78px ${FONT}`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(8,11,16,0.6)";
      ctx.fillText("ColdTrack", 8, 67);
      ctx.fillStyle = "rgba(188,200,214,0.7)";
      ctx.fillText("ColdTrack", 6, 64);
    });

    // Serigrafía y pistas de la placa de desarrollo
    const pcb = canvasTexture(1024, 486, (ctx) => {
      const rnd = lcg(42);
      ctx.fillStyle = "#0b0f14";
      ctx.fillRect(0, 0, 1024, 486);
      ctx.strokeStyle = "#17212c";
      ctx.lineWidth = 3;
      for (let i = 0; i < 70; i++) {
        let x = rnd() * 1024;
        let y = 60 + rnd() * 366;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          if (k % 2 === 0) x += (rnd() - 0.5) * 260;
          else y += (rnd() - 0.5) * 140;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = "#243241";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(236,240,245,0.92)";
      ctx.font = `600 13px ${MONO}`;
      const top = ["3V3", "EN", "VP", "VN", "34", "35", "32", "33", "25", "26", "27", "14", "12", "GND", "13", "D2", "D3", "CMD", "5V"];
      const bottom = ["GND", "23", "22", "TX", "RX", "21", "GND", "19", "18", "5", "17", "16", "4", "0", "2", "15", "D1", "D0", "CLK"];
      const px = (i: number) => ((PIN_X0 + i * PIN_STEP + 0.475) / 0.95) * 1024;
      top.forEach((t, i) => {
        ctx.save();
        ctx.translate(px(i) + 4, 48);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(t, 0, 0);
        ctx.restore();
      });
      bottom.forEach((t, i) => {
        ctx.save();
        ctx.translate(px(i) + 4, 438);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "left";
        ctx.fillText(t, 0, 8);
        ctx.restore();
      });
      ctx.font = `700 19px ${MONO}`;
      ctx.fillText("ESP32 DEVKIT V1", 520, 330);
      ctx.font = `600 12px ${MONO}`;
      ctx.fillText("EN", 905, 80);
      ctx.fillText("BOOT", 895, 418);
      ctx.strokeStyle = "rgba(236,240,245,0.75)";
      ctx.lineWidth = 2;
      ctx.strokeRect(596, 206, 96, 96);
      ctx.strokeRect(742, 108, 78, 52);
    });

    const shield = canvasTexture(512, 512, (ctx) => {
      const rnd = lcg(9);
      ctx.fillStyle = "rgba(38,43,50,0.8)";
      ctx.font = `700 46px ${FONT}`;
      ctx.fillText("ESP-WROOM-32", 44, 120);
      ctx.font = `500 24px ${MONO}`;
      ctx.fillText("FCC ID: 2AC7Z-ESPWROOM32", 44, 178);
      ctx.fillText("211-161007", 44, 214);
      ctx.font = `700 40px ${FONT}`;
      ctx.fillText("CE", 44, 300);
      ctx.fillText("WiFi", 150, 300);
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (rnd() > 0.5) ctx.fillRect(310 + x * 12, 300 + y * 12, 12, 12);
      ctx.strokeStyle = "rgba(38,43,50,0.55)";
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, 476, 476);
    });

    const sct = canvasTexture(512, 230, (ctx) => {
      ctx.fillStyle = "#f4f5f6";
      ctx.beginPath();
      ctx.roundRect(4, 4, 504, 222, 18);
      ctx.fill();
      ctx.fillStyle = "#111418";
      ctx.font = `800 62px ${FONT}`;
      ctx.fillText("SCT-013-000", 28, 88);
      ctx.font = `600 40px ${MONO}`;
      ctx.fillText("100A : 50mA", 28, 150);
      ctx.font = `600 30px ${MONO}`;
      ctx.fillText("K  →  L", 28, 200);
    });

    const mpu = canvasTexture(512, 376, (ctx) => {
      const rnd = lcg(3);
      ctx.fillStyle = "#1b3c9c";
      ctx.fillRect(0, 0, 512, 376);
      ctx.strokeStyle = "#2a52c4";
      ctx.lineWidth = 4;
      for (let i = 0; i < 26; i++) {
        const x = 90 + rnd() * 380;
        const y = 20 + rnd() * 330;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 160, y);
        ctx.lineTo(x + (rnd() - 0.5) * 160, y + (rnd() - 0.5) * 120);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(240,244,250,0.95)";
      ctx.font = `700 20px ${MONO}`;
      ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"].forEach((t, i) => ctx.fillText(t, 62, 50 + i * 41));
      ctx.font = `700 26px ${MONO}`;
      ctx.fillText("GY-521", 330, 340);
      ctx.font = `600 18px ${MONO}`;
      ctx.fillText("ITG/MPU", 330, 44);
      ctx.strokeStyle = "rgba(240,244,250,0.8)";
      ctx.lineWidth = 3;
      ctx.strokeRect(232, 138, 104, 104);
    });

    return { grain, lid, pcb, shield, sct, mpu };
  }, []);
  useEffect(() => () => Object.values(tex).forEach((t) => t.dispose()), [tex]);
  return tex;
}
type Textures = ReturnType<typeof useTextures>;

function useMaterials(tex: Textures) {
  return useMemo(() => {
    const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
    return {
      shell: std({ color: "#232c38", metalness: 0.05, roughness: 0.78, roughnessMap: tex.grain, bumpMap: tex.grain, bumpScale: 0.35 }),
      lid: std({ color: "#46525f", metalness: 0.08, roughness: 0.7, roughnessMap: tex.grain, bumpMap: tex.grain, bumpScale: 0.3 }),
      gasket: std({ color: "#07090c", metalness: 0, roughness: 0.95 }),
      nylon: std({ color: "#0e1116", metalness: 0.05, roughness: 0.42 }),
      nylonFlat: std({ color: "#0e1116", metalness: 0.05, roughness: 0.42, flatShading: true }),
      seal: std({ color: "#3a4048", metalness: 0, roughness: 0.9 }),
      pcbEdge: std({ color: "#0b0f14", metalness: 0.2, roughness: 0.6 }),
      pcbTop: std({ map: tex.pcb, metalness: 0.25, roughness: 0.48 }),
      steel: std({ color: "#d3d9e0", metalness: 1, roughness: 0.3 }),
      steelDark: std({ color: "#8b939e", metalness: 1, roughness: 0.45 }),
      gold: std({ color: "#e2b65a", metalness: 1, roughness: 0.28 }),
      brass: std({ color: "#b8923f", metalness: 1, roughness: 0.4 }),
      chip: std({ color: "#14171b", metalness: 0.15, roughness: 0.5 }),
      black: std({ color: "#090b0e", metalness: 0.1, roughness: 0.6 }),
      smdTan: std({ color: "#a58556", metalness: 0.1, roughness: 0.6 }),
      tantalum: std({ color: "#d9951c", metalness: 0.1, roughness: 0.5 }),
      green: std({ color: "#1a8a43", metalness: 0.02, roughness: 0.5 }),
      white: std({ color: "#cfd4da", metalness: 0.02, roughness: 0.5 }),
      blue: std({ color: "#1f5fe0", metalness: 0.05, roughness: 0.38 }),
      ferrite: std({ color: "#24272c", metalness: 0.3, roughness: 0.7 }),
      sinter: std({ color: "#b28f55", metalness: 0.5, roughness: 0.85 }),
      mpuTop: std({ map: tex.mpu, metalness: 0.25, roughness: 0.48 }),
      mpuEdge: std({ color: "#1b3c9c", metalness: 0.2, roughness: 0.55 }),
      floor: std({ color: "#08111d", metalness: 0.35, roughness: 0.62 }),
    };
  }, [tex]);
}
type Mats = ReturnType<typeof useMaterials>;

/** Activa sombras en todas las mallas opacas del grupo. */
function Shadows({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      if (mat.transparent || mat.type === "MeshBasicMaterial") return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  });
  return <group ref={ref}>{children}</group>;
}

// ---------------------------------------------------------------------------
// Selección / hover
// ---------------------------------------------------------------------------
function Selectable({
  id,
  position,
  ring,
  grow = 1.06,
  active,
  onSelect,
  children,
}: {
  id: SensorId;
  position?: Vec3;
  ring: { radius: number; y: number; offset?: Vec3 } | null;
  grow?: number;
  active: boolean;
  onSelect: (id: SensorId) => void;
  children: ReactNode;
}) {
  const inner = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const [hovered, setHovered] = useState(false);
  useEffect(() => () => void (document.body.style.cursor = "auto"), []);

  useFrame((_, dt) => {
    const s = THREE.MathUtils.damp(inner.current?.scale.x ?? 1, hovered || active ? grow : 1, 10, dt);
    inner.current?.scale.setScalar(s);
    if (ringMat.current) ringMat.current.opacity = THREE.MathUtils.damp(ringMat.current.opacity, active ? 0.95 : hovered ? 0.6 : 0, 10, dt);
  });

  return (
    <group
      position={position}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      <group ref={inner}>{children}</group>
      {ring && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ring.offset?.[0] ?? 0, ring.y, ring.offset?.[2] ?? 0]}>
          <ringGeometry args={[ring.radius, ring.radius + 0.022, 72]} />
          <meshBasicMaterial ref={ringMat} color={[0.3, 2.2, 1.9]} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Gabinete IP65
// ---------------------------------------------------------------------------
function Screw({ mats, r = 0.028 }: { mats: Mats; r?: number }) {
  return (
    <group>
      <mesh material={mats.steel}>
        <cylinderGeometry args={[r, r * 0.92, 0.012, 20]} />
      </mesh>
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} material={mats.black} position={[0, 0.0065, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[r * 1.3, 0.003, r * 0.24]} />
        </mesh>
      ))}
    </group>
  );
}

function Enclosure({ mats }: { mats: Mats }) {
  const geo = useMemo(
    () => ({
      floor: slabGeometry(BW, BD, CORNER, WALL, 0, 0.008),
      walls: slabGeometry(BW, BD, CORNER, BH - WALL, WALL, 0.006),
      gasket: slabGeometry(BW - 0.03, BD - 0.03, CORNER - 0.015, 0.008, 0.02),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  const bx = BW / 2 - 0.105;
  const bz = BD / 2 - 0.105;
  return (
    <group>
      <mesh geometry={geo.floor} material={mats.shell} />
      <mesh geometry={geo.walls} material={mats.shell} position={[0, WALL, 0]} />
      <mesh geometry={geo.gasket} material={mats.gasket} position={[0, BH - 0.003, 0]} />
      {/* torretas con inserto roscado */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * bx, 0, sz * bz]}>
            <mesh material={mats.shell} position={[0, BH / 2, 0]}>
              <cylinderGeometry args={[0.06, 0.066, BH - 0.004, 24]} />
            </mesh>
            <mesh material={mats.brass} position={[0, BH - 0.002, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.006, 20]} />
            </mesh>
            <mesh material={mats.black} position={[0, BH, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.006, 16]} />
            </mesh>
          </group>
        )),
      )}
      {/* nervios interiores */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} material={mats.shell} position={[x, WALL + 0.012, -BD / 2 + WALL + 0.02]}>
          <boxGeometry args={[0.02, 0.024, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

/** Prensacable PG7: tuerca, rosca, cabezal estriado y sello. Eje local +Y = hacia afuera. */
function Gland({ mats }: { mats: Mats }) {
  return (
    <group>
      <mesh material={mats.nylonFlat} position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.088, 0.088, 0.036, 6]} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} material={mats.nylon} position={[0, 0.044 + i * 0.011, 0]}>
          <cylinderGeometry args={[i % 2 ? 0.056 : 0.063, i % 2 ? 0.056 : 0.063, 0.011, 24]} />
        </mesh>
      ))}
      <mesh material={mats.nylonFlat} position={[0, 0.122, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 6]} />
      </mesh>
      <mesh material={mats.nylonFlat} position={[0, 0.172, 0]}>
        <cylinderGeometry args={[0.046, 0.072, 0.05, 12]} />
      </mesh>
      <mesh material={mats.seal} position={[0, 0.203, 0]}>
        <cylinderGeometry args={[0.036, 0.04, 0.014, 20]} />
      </mesh>
    </group>
  );
}

function Lid({ mats, tex, open, status }: { mats: Mats; tex: Textures; open: boolean; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  const k = useRef(0);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useMemo(() => slabGeometry(BW + 0.02, BD + 0.02, CORNER, 0.012, 0.03), []);
  useEffect(() => () => glow.dispose(), [glow]);

  useFrame(({ clock }, dt) => {
    k.current = THREE.MathUtils.damp(k.current, open ? 1 : 0, 3.5, dt);
    const e = k.current;
    const g = ref.current;
    if (g) {
      g.position.set(-0.1 * e, BH + 0.065 + 0.78 * e, -0.32 * e);
      g.rotation.set(-0.14 * e, 0.06 * e, 0.05 * e);
    }
    if (led.current) {
      const pulse = status === "ok" ? 1 : 0.55 + 0.45 * Math.sin(clock.elapsedTime * (status === "error" ? 9 : 4));
      led.current.emissiveIntensity = 3.4 * pulse;
    }
  });

  const sx = BW / 2 - 0.105;
  const sz = BD / 2 - 0.105;
  return (
    <group ref={ref} position={[0, BH + 0.065, 0]}>
      <RoundedBox args={[BW + 0.04, 0.11, BD + 0.04]} radius={0.045} smoothness={6} material={mats.lid} />
      {/* pestaña interior y filo luminoso */}
      <mesh material={mats.shell} position={[0, -0.062, 0]}>
        <boxGeometry args={[BW - 0.14, 0.02, BD - 0.14]} />
      </mesh>
      <mesh geometry={glow} position={[0, -0.066, 0]}>
        <meshStandardMaterial color="#0e7490" emissive="#2dd4bf" emissiveIntensity={1.15} toneMapped={false} />
      </mesh>
      {/* tornillos */}
      {[-1, 1].flatMap((ax) =>
        [-1, 1].map((az) => (
          <group key={`${ax}${az}`} position={[ax * sx, 0.05, az * sz]}>
            <mesh material={mats.black} position={[0, 0.002, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.008, 24]} />
            </mesh>
            <group position={[0, 0.004, 0]} rotation={[0, ax * 0.6 + az, 0]}>
              <Screw mats={mats} />
            </group>
          </group>
        )),
      )}
      {/* grabado */}
      <mesh position={[-0.26, 0.0562, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.2]} />
        <meshStandardMaterial map={tex.lid} transparent roughness={0.6} depthWrite={false} />
      </mesh>
      {/* LED de estado */}
      <mesh position={[0.42, 0.056, 0.26]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.014, 0.07, 6, 14]} />
        <meshStandardMaterial ref={led} color={STATUS_COLOR[status]} emissive={STATUS_COLOR[status]} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh material={mats.black} position={[0.42, 0.0555, 0.26]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 0.06]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Placa ESP32 DevKit
// ---------------------------------------------------------------------------
const SMD: { p: [number, number]; s: [number, number]; m: "smdTan" | "chip" }[] = [
  { p: [0.02, 0.1], s: [0.02, 0.011], m: "smdTan" },
  { p: [0.06, 0.1], s: [0.02, 0.011], m: "chip" },
  { p: [0.02, -0.11], s: [0.011, 0.02], m: "smdTan" },
  { p: [0.05, -0.11], s: [0.011, 0.02], m: "chip" },
  { p: [0.2, 0.11], s: [0.02, 0.011], m: "smdTan" },
  { p: [0.24, 0.11], s: [0.02, 0.011], m: "chip" },
  { p: [0.22, -0.12], s: [0.02, 0.011], m: "chip" },
  { p: [0.3, 0.03], s: [0.011, 0.02], m: "smdTan" },
  { p: [0.33, 0.03], s: [0.011, 0.02], m: "smdTan" },
  { p: [-0.02, 0.0], s: [0.011, 0.02], m: "chip" },
];

function Esp32Board({ mats, tex }: { mats: Mats; tex: Textures }) {
  const top = 0.011;
  const pins = 19;
  return (
    <group position={[0, BOARD_Y, BOARD_Z]}>
      {/* separadores hexagonales */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * 0.435, 0, sz * 0.185]}>
            <mesh material={mats.brass} position={[0, -0.048, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.075, 6]} />
            </mesh>
            <mesh material={mats.gold} position={[0, top + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.012, 0.024, 20]} />
            </mesh>
            <group position={[0, top + 0.006, 0]}>
              <Screw mats={mats} r={0.016} />
            </group>
          </group>
        )),
      )}

      {/* PCB */}
      <mesh material={mats.pcbEdge}>
        <boxGeometry args={[0.95, 0.022, 0.45]} />
      </mesh>
      <mesh material={mats.pcbTop} position={[0, top + 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.95, 0.45]} />
      </mesh>

      {/* módulo ESP-WROOM-32 */}
      <group position={[-0.285, top, 0]}>
        <mesh material={mats.black} position={[0, 0.006, 0]}>
          <boxGeometry args={[0.38, 0.012, 0.3]} />
        </mesh>
        {/* antena en meandro */}
        {Array.from({ length: 6 }).map((_, i) => (
          <group key={i}>
            <mesh material={mats.gold} position={[-0.115 - i * 0.012, 0.0128, 0]}>
              <boxGeometry args={[0.005, 0.0015, 0.22]} />
            </mesh>
            {i < 5 && (
              <mesh material={mats.gold} position={[-0.121 - i * 0.012, 0.0128, (i % 2 ? -1 : 1) * 0.1075]}>
                <boxGeometry args={[0.017, 0.0015, 0.005]} />
              </mesh>
            )}
          </group>
        ))}
        {/* blindaje RF */}
        <RoundedBox args={[0.27, 0.045, 0.27]} radius={0.008} smoothness={3} material={mats.steel} position={[0.045, 0.0345, 0]} />
        <mesh position={[0.045, 0.0575, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.25, 0.25]} />
          <meshStandardMaterial map={tex.shield} transparent metalness={0.6} roughness={0.5} depthWrite={false} />
        </mesh>
        {/* pads castellados */}
        {[-1, 1].flatMap((s) =>
          Array.from({ length: 14 }).map((_, i) => (
            <mesh key={`${s}${i}`} material={mats.gold} position={[-0.09 + i * 0.02, 0.006, s * 0.148]}>
              <boxGeometry args={[0.01, 0.0135, 0.008]} />
            </mesh>
          )),
        )}
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} material={mats.gold} position={[0.188, 0.006, -0.09 + i * 0.02]}>
            <boxGeometry args={[0.008, 0.0135, 0.01]} />
          </mesh>
        ))}
      </group>

      {/* conector USB */}
      <group position={[0.452, top + 0.022, 0]}>
        <RoundedBox args={[0.1, 0.042, 0.125]} radius={0.007} smoothness={3} material={mats.steel} />
        <mesh material={mats.black} position={[0.0505, 0, 0]}>
          <boxGeometry args={[0.002, 0.024, 0.098]} />
        </mesh>
        <mesh material={mats.gold} position={[0.046, -0.003, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.07]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.steelDark} position={[-0.02, -0.018, s * 0.068]}>
            <boxGeometry args={[0.03, 0.01, 0.012]} />
          </mesh>
        ))}
      </group>

      {/* pulsadores EN / BOOT */}
      {[-0.135, 0.135].map((z) => (
        <group key={z} position={[0.37, top, z]}>
          <mesh material={mats.steel} position={[0, 0.011, 0]}>
            <boxGeometry args={[0.058, 0.022, 0.058]} />
          </mesh>
          <mesh material={mats.black} position={[0, 0.028, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.014, 16]} />
          </mesh>
          {[-1, 1].flatMap((a) =>
            [-1, 1].map((b) => (
              <mesh key={`${a}${b}`} material={mats.steelDark} position={[a * 0.034, 0.003, b * 0.02]}>
                <boxGeometry args={[0.012, 0.006, 0.01]} />
              </mesh>
            )),
          )}
        </group>
      ))}

      {/* CP2102 (QFN) */}
      <group position={[0.155, top, 0.005]}>
        <mesh material={mats.steelDark} position={[0, 0.002, 0]}>
          <boxGeometry args={[0.096, 0.004, 0.096]} />
        </mesh>
        <mesh material={mats.chip} position={[0, 0.008, 0]}>
          <boxGeometry args={[0.084, 0.016, 0.084]} />
        </mesh>
        <mesh material={mats.steelDark} position={[-0.03, 0.0165, -0.03]}>
          <cylinderGeometry args={[0.005, 0.005, 0.001, 10]} />
        </mesh>
      </group>

      {/* regulador AMS1117 (SOT-223) */}
      <group position={[0.265, top, -0.085]}>
        <mesh material={mats.chip} position={[0, 0.011, 0]}>
          <boxGeometry args={[0.07, 0.022, 0.04]} />
        </mesh>
        <mesh material={mats.steel} position={[0, 0.004, -0.03]}>
          <boxGeometry args={[0.036, 0.008, 0.022]} />
        </mesh>
        {[-0.024, 0, 0.024].map((x) => (
          <mesh key={x} material={mats.steel} position={[x, 0.004, 0.028]}>
            <boxGeometry args={[0.01, 0.008, 0.018]} />
          </mesh>
        ))}
      </group>

      {/* capacitor de tantalio y pasivos */}
      <group position={[0.12, top, -0.12]}>
        <mesh material={mats.tantalum} position={[0, 0.011, 0]}>
          <boxGeometry args={[0.042, 0.022, 0.026]} />
        </mesh>
        <mesh material={mats.black} position={[-0.014, 0.0222, 0]}>
          <boxGeometry args={[0.006, 0.001, 0.026]} />
        </mesh>
      </group>
      {SMD.map(({ p, s, m }, i) => (
        <group key={i} position={[p[0], top, p[1]]}>
          <mesh material={mats.steelDark} position={[0, 0.0035, 0]}>
            <boxGeometry args={[s[0] + 0.004, 0.007, s[1] + 0.001]} />
          </mesh>
          <mesh material={mats[m]} position={[0, 0.0045, 0]}>
            <boxGeometry args={[s[0] * 0.62, 0.009, s[1] * (s[0] > s[1] ? 1.05 : 0.62)]} />
          </mesh>
        </group>
      ))}

      {/* LEDs */}
      <mesh position={[0.29, top + 0.005, 0.1]}>
        <boxGeometry args={[0.02, 0.01, 0.012]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh position={[0.29, top + 0.005, -0.02]}>
        <boxGeometry args={[0.02, 0.01, 0.012]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
      </mesh>

      {/* tiras de pines */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, top, s * 0.2]}>
          {Array.from({ length: pins }).map((_, i) => (
            <group key={i} position={[PIN_X0 + i * PIN_STEP, 0, 0]}>
              <mesh material={mats.chip} position={[0, 0.0125, 0]}>
                <boxGeometry args={[0.037, 0.025, 0.034]} />
              </mesh>
              <mesh material={mats.gold} position={[0, 0.055, 0]}>
                <boxGeometry args={[0.011, 0.06, 0.011]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Borneras y cableado interno
// ---------------------------------------------------------------------------
const TB_X = [-0.36, 0.36];
const TB_Z = 0.31;
const TB_POLES = [-0.12, -0.04, 0.04, 0.12];

function TerminalBlocks({ mats }: { mats: Mats }) {
  return (
    <group>
      {TB_X.map((x) => (
        <group key={x} position={[x, WALL, TB_Z]}>
          <mesh material={mats.green} position={[0, 0.05, -0.01]}>
            <boxGeometry args={[0.34, 0.1, 0.075]} />
          </mesh>
          <mesh material={mats.green} position={[0, 0.03, 0.04]}>
            <boxGeometry args={[0.34, 0.06, 0.03]} />
          </mesh>
          {TB_POLES.map((dx) => (
            <group key={dx} position={[dx, 0, 0]}>
              <mesh material={mats.black} position={[0, 0.1005, -0.01]}>
                <cylinderGeometry args={[0.024, 0.024, 0.002, 16]} />
              </mesh>
              <group position={[0, 0.094, -0.01]}>
                <Screw mats={mats} r={0.02} />
              </group>
              <mesh material={mats.steelDark} position={[0, 0.032, 0.0555]}>
                <boxGeometry args={[0.034, 0.034, 0.002]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function Tube({ points, radius, color, roughness = 0.5 }: { points: Vec3[]; radius: number; color: string; roughness?: number }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.5,
    );
    return new THREE.TubeGeometry(curve, Math.max(24, points.length * 10), radius, 10, false);
  }, [points, radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} />
    </mesh>
  );
}

const WIRE_COLORS = ["#c62828", "#111317", "#e2b100", "#1e8e3e", "#c62828", "#e8e8e8", "#1565c0", "#111317"];

const INNER_WIRES: { points: Vec3[]; color: string }[] = GLAND_X.flatMap((gx, g) =>
  [0, 1].map((w) => {
    const block = g < 3 ? 0 : 1;
    const pole = (g * 2 + w) % 4;
    const ex = TB_X[block] + TB_POLES[pole];
    return {
      color: WIRE_COLORS[(g * 2 + w) % WIRE_COLORS.length],
      points: [
        [gx + (w ? 0.012 : -0.012), GLAND_Y, BD / 2 - 0.02],
        [gx + (w ? 0.02 : -0.02), GLAND_Y - 0.02, BD / 2 - WALL - 0.04],
        [THREE.MathUtils.lerp(gx, ex, 0.7), 0.1, TB_Z + 0.1],
        [ex, WALL + 0.032, TB_Z + 0.058],
      ] as Vec3[],
    };
  }),
);

const JUMPERS: { points: Vec3[]; color: string; pin: Vec3 }[] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const block = i < 4 ? 0 : 1;
  const sx = TB_X[block] + TB_POLES[i % 4];
  const pinIndex = [1, 3, 5, 6, 10, 12, 14, 17][i];
  const px = PIN_X0 + pinIndex * PIN_STEP;
  const pinTop: Vec3 = [px, BOARD_Y + 0.011 + 0.1, BOARD_Z + 0.2];
  return {
    color: WIRE_COLORS[(i + 3) % 8],
    pin: [px, BOARD_Y + 0.011 + 0.075, BOARD_Z + 0.2] as Vec3,
    points: [
      [sx, WALL + 0.06, TB_Z - 0.05],
      [sx, WALL + 0.13, TB_Z - 0.09],
      [THREE.MathUtils.lerp(sx, px, 0.6), 0.29, TB_Z - 0.12],
      [px, pinTop[1] + 0.05, pinTop[2] + 0.012],
      pinTop,
    ] as Vec3[],
  };
});

function InnerWiring({ mats }: { mats: Mats }) {
  return (
    <group>
      {INNER_WIRES.map((w, i) => (
        <Tube key={`w${i}`} points={w.points} radius={0.009} color={w.color} />
      ))}
      {JUMPERS.map((j, i) => (
        <group key={`j${i}`}>
          <Tube points={j.points} radius={0.006} color={j.color} />
          <mesh material={mats.chip} position={j.pin}>
            <boxGeometry args={[0.03, 0.07, 0.03]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Cables exteriores
// ---------------------------------------------------------------------------
const Z0 = BD / 2;
const FLOOR_Y = CABLE_R + 0.002;

function coil(center: [number, number], r: number, turns: number, from: number): Vec3[] {
  const steps = Math.round(turns * 12);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + (i / 12) * Math.PI * 2;
    const rr = r - 0.012 * Math.sin(i * 0.9);
    return [center[0] + Math.cos(a) * rr, FLOOR_Y + (i / steps) * 0.07, center[1] + Math.sin(a) * rr] as Vec3;
  });
}

const start = (g: number): Vec3[] => [
  [GLAND_X[g], GLAND_Y, Z0 + 0.19],
  [GLAND_X[g], GLAND_Y - 0.005, Z0 + 0.3],
];

const SHT_ENTRY: Vec3 = [SHT_POS[0] + 0.155, SHT_POS[1], SHT_POS[2] - 0.155];
const DS18_ENTRY: Vec3 = [DS18_POS[0] + 0.04, 0.028, DS18_POS[2] - 0.18];
const CABLE_PATHS: { points: Vec3[]; color: string }[] = [
  {
    color: "#0c0e11",
    points: [
      ...start(0),
      [-0.65, FLOOR_Y + 0.03, Z0 + 0.5],
      [-0.95, FLOOR_Y, Z0 + 0.48],
      ...coil([-1.52, 0.58], 0.25, 2.2, -0.35),
      [-1.42, FLOOR_Y + 0.05, 1.02],
      [-1.56, SHT_POS[1], 1.15],
      SHT_ENTRY,
    ],
  },
  {
    color: "#1e293b",
    points: [
      ...start(1),
      [-0.36, FLOOR_Y + 0.025, Z0 + 0.52],
      [-0.64, FLOOR_Y, 1.15],
      [-0.88, FLOOR_Y, 1.38],
      DS18_ENTRY,
    ],
  },
  {
    color: "#3b4047",
    points: [...start(2), [-0.04, FLOOR_Y + 0.02, Z0 + 0.56], [-0.08, FLOOR_Y, 1.25], [-0.1, FLOOR_Y, 1.44], [MPU_POS[0] + 0.06, 0.03, MPU_POS[2] - 0.1]],
  },
  {
    color: "#0c0e11",
    points: [...start(3), [0.32, FLOOR_Y + 0.02, Z0 + 0.56], [0.42, FLOOR_Y, 1.2], [0.58, FLOOR_Y + 0.02, 1.36], [SCT_POS[0] - 0.215, 0.095, SCT_POS[2] - 0.118]],
  },
  {
    color: "#5a4636",
    points: [...start(4), [0.64, FLOOR_Y + 0.02, Z0 + 0.52], [0.98, FLOOR_Y, 1.02], [1.38, FLOOR_Y, 0.78], [REED_POS[0] - 0.19, 0.045, REED_POS[2] + 0.062]],
  },
];

function Cables() {
  return (
    <group>
      {CABLE_PATHS.map((c, i) => (
        <Tube key={i} points={c.points} radius={CABLE_R} color={c.color} roughness={0.42} />
      ))}
    </group>
  );
}

function Sht31({ mats }: { mats: Mats }) {
  return (
    <group rotation={[0, Math.PI / 4, -Math.PI / 2]}>
      <mesh material={mats.sinter} position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.047, 0.047, 0.17, 24]} />
      </mesh>
      {[-0.14, -0.105, -0.07, -0.035, 0].map((y) => (
        <mesh key={y} material={mats.nylon} position={[0, y, 0]}>
          <cylinderGeometry args={[0.062, 0.062, 0.017, 28]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={mats.nylon} position={[Math.cos((i * Math.PI) / 2) * 0.056, -0.07, Math.sin((i * Math.PI) / 2) * 0.056]}>
          <boxGeometry args={[0.012, 0.16, 0.012]} />
        </mesh>
      ))}
      <mesh material={mats.nylon} position={[0, -0.158, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.062, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={mats.nylon} position={[0, 0.085, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.15, 28]} />
      </mesh>
      <mesh material={mats.white} position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.0628, 0.0628, 0.07, 28]} />
      </mesh>
      <mesh material={mats.nylon} position={[0, 0.185, 0]}>
        <cylinderGeometry args={[0.034, 0.058, 0.05, 20]} />
      </mesh>
    </group>
  );
}

function SteelProbe({ mats, tagMat, withClamp }: { mats: Mats; tagMat: THREE.Material; withClamp?: boolean }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={mats.steel} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.22, 24]} />
      </mesh>
      <mesh material={mats.steel} position={[0, 0.17, 0]}>
        <sphereGeometry args={[0.026, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[-0.032, -0.044].map((y) => (
        <mesh key={y} material={mats.steelDark} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.0265, 0.003, 10, 24]} />
        </mesh>
      ))}
      <mesh material={mats.nylon} position={[0, -0.085, 0]}>
        <cylinderGeometry args={[0.032, 0.03, 0.08, 20]} />
      </mesh>
      <mesh material={tagMat} position={[0, -0.078, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.022, 20]} />
      </mesh>
      <mesh material={mats.nylon} position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.035, 16]} />
      </mesh>
      {withClamp && (
        <group position={[0, 0.055, 0]}>
          <mesh material={mats.brass} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.005, 10, 24]} />
          </mesh>
          <mesh material={mats.brass} position={[0.038, 0, 0]}>
            <boxGeometry args={[0.036, 0.018, 0.012]} />
          </mesh>
          <group position={[0.044, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
            <Screw mats={mats} r={0.009} />
          </group>
        </group>
      )}
    </group>
  );
}

const DS18_LEADS: Vec3[][] = [
  [
    [0.04, -0.008, -0.14],
    [0.055, -0.008, -0.09],
    [0.065, 0, -0.05],
  ],
  [
    [0.02, -0.008, -0.14],
    [-0.03, -0.008, -0.1],
    [-0.075, 0, -0.06],
  ],
];

function Ds18b20({ mats }: { mats: Mats }) {
  return (
    <group rotation={[0, 0.22, 0]}>
      <group position={[0.065, 0, 0.09]}>
        <SteelProbe mats={mats} tagMat={mats.blue} withClamp />
      </group>
      <group position={[-0.085, -0.002, 0.07]} rotation={[0, -0.26, 0]}>
        <SteelProbe mats={mats} tagMat={mats.gold} />
      </group>
      <RoundedBox args={[0.085, 0.038, 0.075]} radius={0.01} smoothness={3} material={mats.nylon} position={[0.035, -0.006, -0.155]} />
      <mesh material={mats.blue} position={[0.035, 0.0135, -0.155]}>
        <boxGeometry args={[0.055, 0.003, 0.038]} />
      </mesh>
      {DS18_LEADS.map((pts, i) => (
        <Tube key={i} points={pts} radius={0.014} color="#111317" roughness={0.45} />
      ))}
    </group>
  );
}

function ReedBlock({ mats, wired }: { mats: Mats; wired?: boolean }) {
  return (
    <group>
      <RoundedBox args={[0.3, 0.085, 0.1]} radius={0.014} smoothness={4} material={mats.white} />
      <RoundedBox args={[0.44, 0.024, 0.1]} radius={0.01} smoothness={3} material={mats.white} position={[0, -0.0305, 0]} />
      {[-0.185, 0.185].map((x) => (
        <group key={x} position={[x, -0.018, 0]}>
          <mesh material={mats.black}>
            <cylinderGeometry args={[0.02, 0.014, 0.004, 16]} />
          </mesh>
          <group position={[0, -0.002, 0]}>
            <Screw mats={mats} r={0.013} />
          </group>
        </group>
      ))}
      {/* marca de alineación */}
      <mesh material={mats.seal} position={[0, 0.0432, wired ? -0.03 : 0.03]} rotation={[0, wired ? Math.PI : 0, 0]}>
        <coneGeometry args={[0.012, 0.002, 3]} />
      </mesh>
      {wired && (
        <mesh material={mats.seal} position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.036, 0.03, 16]} />
        </mesh>
      )}
    </group>
  );
}

function Reed({ mats }: { mats: Mats }) {
  return (
    <group position={[0, -0.0125, 0]}>
      <group position={[0, 0, 0.062]}>
        <ReedBlock mats={mats} wired />
      </group>
      <group position={[0.02, 0, -0.062]}>
        <ReedBlock mats={mats} />
      </group>
    </group>
  );
}

function Sct013({ mats, tex }: { mats: Mats; tex: Textures }) {
  const geo = useMemo(() => {
    const body = rrect(new THREE.Shape(), 0.38, 0.36, 0.045);
    const win = new THREE.Path();
    const hw = 0.085;
    const cy = 0.035;
    win.moveTo(-hw, cy - hw);
    win.lineTo(hw, cy - hw);
    win.lineTo(hw, cy + hw * 0.4);
    win.absarc(0, cy + hw * 0.4, hw, 0, Math.PI, false);
    win.lineTo(-hw, cy - hw);
    body.holes.push(win);
    const b = new THREE.ExtrudeGeometry(body, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 4, curveSegments: 28 });
    b.translate(0, 0, -0.075);

    const core = new THREE.Shape();
    const ow = hw + 0.022;
    core.moveTo(-ow, cy - ow);
    core.lineTo(ow, cy - ow);
    core.lineTo(ow, cy + hw * 0.4);
    core.absarc(0, cy + hw * 0.4, ow, 0, Math.PI, false);
    core.lineTo(-ow, cy - ow);
    const inner = new THREE.Path();
    const iw = hw - 0.006;
    inner.moveTo(-iw, cy - iw);
    inner.lineTo(iw, cy - iw);
    inner.lineTo(iw, cy + hw * 0.4);
    inner.absarc(0, cy + hw * 0.4, iw, 0, Math.PI, false);
    inner.lineTo(-iw, cy - iw);
    core.holes.push(inner);
    const c = new THREE.ExtrudeGeometry(core, { depth: 0.16, bevelEnabled: false, curveSegments: 28 });
    c.translate(0, 0, -0.08);
    return { body: b, core: c };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <group rotation={[0, -0.5, 0]}>
      <mesh geometry={geo.body} material={mats.blue} />
      <mesh geometry={geo.core} material={mats.ferrite} />
      {/* línea de partición */}
      <mesh material={mats.black} position={[0, 0.06, 0]}>
        <boxGeometry args={[0.41, 0.005, 0.181]} />
      </mesh>
      {/* bisagra */}
      <mesh material={mats.blue} position={[-0.2, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.15, 16]} />
      </mesh>
      {/* traba */}
      <group position={[0.207, 0.04, 0]}>
        <mesh material={mats.blue}>
          <boxGeometry args={[0.03, 0.15, 0.09]} />
        </mesh>
        <mesh material={mats.blue} position={[0.012, 0.085, 0]}>
          <boxGeometry args={[0.03, 0.03, 0.09]} />
        </mesh>
        {[-0.03, 0, 0.03].map((y) => (
          <mesh key={y} material={mats.blue} position={[0.017, y - 0.02, 0]}>
            <boxGeometry args={[0.006, 0.012, 0.08]} />
          </mesh>
        ))}
      </group>
      {/* etiqueta */}
      <mesh position={[0, -0.115, 0.0895]}>
        <planeGeometry args={[0.26, 0.117]} />
        <meshStandardMaterial map={tex.sct} transparent roughness={0.55} />
      </mesh>
      {/* salida del cable con alivio de tensión */}
      <group position={[-0.2, -0.105, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={mats.nylon} position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.034, 0.045, 0.06, 16]} />
        </mesh>
      </group>
    </group>
  );
}

function Mpu6050({ mats }: { mats: Mats }) {
  return (
    <group rotation={[0, 0.35, 0]}>
      <mesh material={mats.mpuEdge}>
        <boxGeometry args={[0.3, 0.018, 0.22]} />
      </mesh>
      <mesh material={mats.mpuTop} position={[0, 0.0094, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.22]} />
      </mesh>
      {/* MPU-6050 (QFN) */}
      <mesh material={mats.chip} position={[0.016, 0.016, 0.001]}>
        <boxGeometry args={[0.05, 0.014, 0.05]} />
      </mesh>
      <mesh material={mats.steelDark} position={[0.016, 0.0105, 0.001]}>
        <boxGeometry args={[0.058, 0.003, 0.058]} />
      </mesh>
      {/* tira de 8 pines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i} position={[-0.128, 0.009, -0.084 + i * 0.024]}>
          <mesh material={mats.chip} position={[0, 0.0125, 0]}>
            <boxGeometry args={[0.024, 0.025, 0.0225]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.05, 0]}>
            <boxGeometry args={[0.008, 0.055, 0.008]} />
          </mesh>
        </group>
      ))}
      {/* pasivos, regulador y LED */}
      {[
        [0.08, -0.06],
        [0.1, -0.06],
        [0.08, 0.06],
        [-0.04, 0.07],
        [-0.04, -0.07],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} material={mats.smdTan} position={[x, 0.0135, z]}>
          <boxGeometry args={[0.012, 0.009, 0.02]} />
        </mesh>
      ))}
      <mesh material={mats.chip} position={[0.1, 0.015, 0.01]}>
        <boxGeometry args={[0.03, 0.012, 0.022]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[0.118, 0.0096, s * 0.08]}>
          <mesh material={mats.gold} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.011, 0.02, 20]} />
          </mesh>
          <mesh material={mats.black} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0002, 0]}>
            <circleGeometry args={[0.011, 16]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.06, 0.0135, 0.075]}>
        <boxGeometry args={[0.014, 0.008, 0.01]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Etiquetas, cámara y escena
// ---------------------------------------------------------------------------
function Callout({ id, active, onSelect, portal }: { id: SensorId; active: boolean; onSelect: (id: SensorId) => void; portal: RefObject<HTMLElement> }) {
  const c = CALLOUTS[id];
  const info = SENSOR_INFO[id];
  return (
    <Html position={c.at} zIndexRange={Z_RANGE} portal={portal}>
      <div
        className={`pointer-events-auto flex items-center ${c.side === "left" ? "flex-row-reverse" : ""}`}
        style={{ transform: c.side === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)" }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
        <span className="h-px w-6 shrink-0 bg-slate-400/60" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
          className={`whitespace-nowrap rounded-md border bg-slate-900/80 px-2.5 py-1.5 text-left backdrop-blur transition-colors hover:border-teal-300/70 ${
            active ? "border-teal-300/80" : "border-white/15"
          }`}
        >
          <span className="block text-xs text-slate-100">
            <span className="mr-1.5 text-teal-300">{info.n}.</span>
            {info.name}
          </span>
          <span className="block text-[10px] text-slate-400">
            {info.model} · {info.bus}
          </span>
        </button>
      </div>
    </Html>
  );
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

function CameraRig({ active }: { active: SensorId | null }) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  useEffect(() => {
    const v = VIEWS[active ?? "default"];
    controls.current?.setLookAt(...v.pos, ...v.target, true);
  }, [active]);
  return <CameraControls ref={controls} makeDefault minDistance={0.7} maxDistance={10} maxPolarAngle={Math.PI / 2.06} smoothTime={0.35} />;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function Scene({
  active,
  open,
  showLabels,
  status,
  onSelect,
  modelUrl,
  overlay,
  onReady,
}: {
  onReady: () => void;
  active: SensorId | null;
  open: boolean;
  showLabels: boolean;
  status: Status;
  onSelect: (id: SensorId) => void;
  modelUrl?: string;
  overlay: HTMLDivElement | null;
}) {
  const tex = useTextures();
  const mats = useMaterials(tex);
  const portal = useMemo(() => ({ current: overlay }) as RefObject<HTMLElement>, [overlay]);

  return (
    <>
      <color attach="background" args={["#0a111d"]} />
      <fog attach="fog" args={["#0c1626", 9, 22]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[-3.5, 6.5, 4.5]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={16}
      />
      <pointLight position={[3, 1.5, -2.5]} intensity={14} color="#22d3ee" />
      <pointLight position={[-3, 1, 3]} intensity={5} color="#93c5fd" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} position={[0, 5, 1]} scale={[9, 4, 1]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={2} position={[-5, 2.5, 2]} scale={[4, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 2, 2]} scale={[3, 6, 1]} rotation={[0, -Math.PI / 2, 0]} color="#99f6e4" />
        <Lightformer form="rect" intensity={1.5} position={[0, 2, 6]} scale={[8, 3, 1]} rotation={[0, Math.PI, 0]} />
      </Environment>

      {modelUrl ? (
        <Suspense fallback={null}>
          <GltfModel url={modelUrl} />
        </Suspense>
      ) : (
        <Shadows>
          <Enclosure mats={mats} />
          {GLAND_X.map((x) => (
            <group key={x} position={[x, GLAND_Y, Z0 - 0.008]} rotation={[Math.PI / 2, 0, 0]}>
              <Gland mats={mats} />
            </group>
          ))}
          <Lid mats={mats} tex={tex} open={open} status={status} />
          <TerminalBlocks mats={mats} />
          <InnerWiring mats={mats} />
          <Selectable id="esp32" ring={null} grow={1.025} active={active === "esp32"} onSelect={onSelect}>
            <Esp32Board mats={mats} tex={tex} />
          </Selectable>
          <Cables />
          <Selectable id="sht31" position={SHT_POS} ring={{ radius: 0.3, y: -0.06 }} active={active === "sht31"} onSelect={onSelect}>
            <Sht31 mats={mats} />
          </Selectable>
          <Selectable id="ds18b20" position={DS18_POS} ring={{ radius: 0.27, y: -0.038 }} active={active === "ds18b20"} onSelect={onSelect}>
            <Ds18b20 mats={mats} />
          </Selectable>
          <Selectable id="reed" position={REED_POS} ring={{ radius: 0.3, y: -0.05 }} active={active === "reed"} onSelect={onSelect}>
            <Reed mats={mats} />
          </Selectable>
          <Selectable id="sct013" position={SCT_POS} ring={{ radius: 0.33, y: -0.195 }} active={active === "sct013"} onSelect={onSelect}>
            <Sct013 mats={mats} tex={tex} />
          </Selectable>
          <Selectable id="mpu6050" position={MPU_POS} ring={{ radius: 0.24, y: -0.008 }} active={active === "mpu6050"} onSelect={onSelect}>
            <Mpu6050 mats={mats} />
          </Selectable>
        </Shadows>
      )}

      {!modelUrl && overlay && showLabels && SENSOR_ORDER.map((id) => <Callout key={id} id={id} active={active === id} onSelect={onSelect} portal={portal} />)}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow material={mats.floor}>
        <planeGeometry args={[60, 60]} />
      </mesh>
      <Grid position={[0, 0.001, 0]} infiniteGrid cellSize={0.25} sectionSize={1} cellColor="#0f3a48" sectionColor="#17707c" fadeDistance={11} fadeStrength={2.5} />
      <CameraRig active={active} />
      <Ready onReady={onReady} />
      <EffectComposer>
        <N8AO aoRadius={0.22} intensity={2.6} distanceFalloff={1} quality="medium" />
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.85} radius={0.7} />
      </EffectComposer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function ColdTrackSensor3D({ activeSensor, onSelectSensor, telemetryStatus = "ok", modelUrl, className = "" }: ColdTrackSensor3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, isFallbackFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const controlled = activeSensor !== undefined;
  const [internal, setInternal] = useState<SensorId | null>(null);
  const [open, setOpen] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const active = controlled ? (activeSensor ?? null) : internal;

  // Referencia estable para no reconfigurar el Canvas en cada render.
  const selectRef = useRef<(id: SensorId | null) => void>(() => {});
  selectRef.current = (id) => {
    const next = id !== null && id === active ? null : id;
    if (!controlled) setInternal(next);
    onSelectSensor?.(next);
    if (next === "esp32") setOpen(true);
  };
  const handlers = useMemo(
    () => ({
      select: (id: SensorId) => selectRef.current(id),
      clear: () => selectRef.current(null),
      ready: () => setReady(true),
    }),
    [],
  );

  const info = active ? SENSOR_INFO[active] : null;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0a111d] ${
        isFallbackFullscreen
          ? "fixed inset-0 z-50 h-dvh w-screen rounded-none"
          : isFullscreen
            ? "h-full w-full rounded-none"
            : `h-full min-h-[520px] w-full rounded-xl ${className}`
      }`}
    >
      <Canvas shadows dpr={DPR} camera={CAMERA} onPointerMissed={handlers.clear}>
        <Scene active={active} open={open} showLabels={showLabels} status={telemetryStatus} onSelect={handlers.select} modelUrl={modelUrl} overlay={overlay} onReady={handlers.ready} />
      </Canvas>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Cargando modelo 3D…
        </div>
      )}
      <div ref={setOverlay} className="pointer-events-none absolute inset-0 isolate overflow-hidden" />

      <div className="pointer-events-none absolute left-5 top-4">
        <h3 className="text-lg font-medium text-slate-100">Sensor IoT ColdTrack</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[telemetryStatus] }} />
          {STATUS_LABEL[telemetryStatus]}
        </p>
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="flex items-center divide-x divide-white/10 rounded-full border border-white/15 bg-slate-900/70 backdrop-blur">
          <button
            type="button"
            role="switch"
            aria-checked={open}
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-200 hover:text-white"
          >
            <span className="hidden sm:inline">Abrir tapa / Despiece</span>
            <span className="sm:hidden">Despiece</span>
            <span className={`relative h-4 w-8 rounded-full transition-colors ${open ? "bg-emerald-500" : "bg-slate-600"}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${open ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={showLabels}
            onClick={() => setShowLabels(!showLabels)}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-200 hover:text-white"
          >
            <span>Etiquetas</span>
            <span className={`relative h-4 w-8 rounded-full transition-colors ${showLabels ? "bg-emerald-500" : "bg-slate-600"}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${showLabels ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">{isFullscreen ? "Salir" : "Pantalla completa"}</span>
        </button>
      </div>

      {/* Tarjeta del componente seleccionado */}
      {info && (
        <div className="absolute bottom-16 left-4 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-white/10 bg-slate-900/85 p-3.5 backdrop-blur">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-400/15 text-teal-300">
              <info.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100">{info.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{info.model}</p>
            </div>
            <button type="button" onClick={handlers.clear} aria-label="Cerrar" className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="mt-3 space-y-2 text-xs">
            <div>
              <dt className="text-slate-400">Qué mide</dt>
              <dd className="text-slate-100">{info.mide}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Conexión al ESP32</dt>
              <dd className="text-slate-100">{info.conexion}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Falla que detecta</dt>
              <dd className="text-slate-100">{info.falla}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Selector de componentes */}
      <div className="absolute bottom-4 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-white/15 bg-slate-900/70 p-1 backdrop-blur">
        {SENSOR_ORDER.map((id) => {
          const Icon = SENSOR_INFO[id].icon;
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handlers.select(id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${
                on ? "bg-teal-400 font-medium text-slate-950" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {SENSOR_INFO[id].model}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ColdTrackSensor3D;
