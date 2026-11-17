import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { CameraControls, ContactShadows, Environment, Grid, Lightformer, RoundedBox, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Activity, Cpu, DoorClosed, Droplets, X, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------
export type SensorId = "esp32" | "sht31" | "reed" | "sct013" | "mpu6050";

export type ColdTrackSensor3DProps = {
  activeSensor?: SensorId | null;
  onSelectSensor?: (id: SensorId | null) => void;
  telemetryStatus?: "ok" | "warning" | "error";
  /** Opcional: reemplaza el gabinete procedural por un modelo .glb. */
  modelUrl?: string;
  className?: string;
};

type Vec3 = [number, number, number];

const SENSOR_INFO: Record<SensorId, { name: string; model: string; icon: LucideIcon; mide: string; conexion: string; falla: string }> = {
  esp32: {
    name: "Microcontrolador",
    model: "ESP32-WROOM-32",
    icon: Cpu,
    mide: "Concentra los 5 parámetros y los transmite por Wi-Fi (MQTT).",
    conexion: "Alimentación 5 V por USB-C. Buses I2C, ADC1 y GPIO hacia los sensores.",
    falla: "Pérdida de conectividad o reinicios del nodo.",
  },
  sht31: {
    name: "Temperatura y humedad",
    model: "SHT31 / DHT22",
    icon: Droplets,
    mide: "Temperatura interior (°C) y humedad relativa (%).",
    conexion: "I2C: SDA en GPIO 21, SCL en GPIO 22 (dirección 0x44).",
    falla: "Pérdida de frío, fuga de gas o burletes dañados.",
  },
  reed: {
    name: "Sensor magnético de puerta",
    model: "Reed Switch",
    icon: DoorClosed,
    mide: "Estado de la puerta: abierta o cerrada.",
    conexion: "GPIO 27 como entrada digital con pull-up interno.",
    falla: "Puerta abierta o mal cerrada por tiempo prolongado.",
  },
  sct013: {
    name: "Pinza amperométrica",
    model: "SCT-013",
    icon: Zap,
    mide: "Corriente del compresor (A), sin cortar el cable.",
    conexion: "ADC1: GPIO 34, con resistencia de carga y tensión de referencia.",
    falla: "Compresor trabado (sobrecorriente) o que no arranca.",
  },
  mpu6050: {
    name: "Acelerómetro / vibración",
    model: "MPU-6050",
    icon: Activity,
    mide: "Vibración del compresor en tres ejes.",
    conexion: "I2C: SDA en GPIO 21, SCL en GPIO 22 (dirección 0x68).",
    falla: "Desbalance, soportes flojos o compresor trabado.",
  },
};

const SENSOR_ORDER: SensorId[] = ["esp32", "sht31", "reed", "sct013", "mpu6050"];
const STATUS_COLOR = { ok: "#34d399", warning: "#fbbf24", error: "#f87171" } as const;
const STATUS_LABEL = { ok: "Operativo", warning: "Con advertencias", error: "Con fallas" } as const;

// Gabinete (unidades arbitrarias, ~decímetros)
const BW = 1.5;
const BH = 0.42;
const BD = 1.0;
const WALL = 0.05;
const GLAND_X = [-0.52, -0.18, 0.18, 0.52];
const GLAND_Y = 0.2;

const SENSOR_POS: Record<Exclude<SensorId, "esp32">, Vec3> = {
  sht31: [-1.55, 0.075, 1.0],
  mpu6050: [-0.65, 0.01, 1.6],
  sct013: [0.75, 0.19, 1.55],
  reed: [1.6, 0.045, 0.8],
};
const CABLES: { to: Exclude<SensorId, "esp32">; gland: number; end: Vec3 }[] = [
  { to: "sht31", gland: 0, end: [-1.38, 0.075, 0.93] },
  { to: "mpu6050", gland: 1, end: [-0.62, 0.03, 1.5] },
  { to: "sct013", gland: 2, end: [0.72, 0.05, 1.38] },
  { to: "reed", gland: 3, end: [1.44, 0.045, 0.8] },
];

const DPR: [number, number] = [1, 1.75];
const VIEWS: Record<SensorId | "default", { pos: Vec3; target: Vec3 }> = {
  default: { pos: [2.7, 2.4, 3.9], target: [0, 0.25, 0.45] },
  esp32: { pos: [0.75, 1.45, 1.25], target: [0, 0.15, -0.05] },
  sht31: { pos: [-1.2, 0.9, 2.3], target: SENSOR_POS.sht31 },
  mpu6050: { pos: [-0.25, 0.8, 2.7], target: SENSOR_POS.mpu6050 },
  sct013: { pos: [1.45, 0.95, 2.75], target: SENSOR_POS.sct013 },
  reed: { pos: [2.6, 0.9, 1.9], target: SENSOR_POS.reed },
};

const CAMERA = { position: VIEWS.default.pos, fov: 36 };

function useMaterials() {
  return useMemo(
    () => ({
      shell: new THREE.MeshStandardMaterial({ color: "#1b2430", metalness: 0.15, roughness: 0.85 }),
      lid: new THREE.MeshStandardMaterial({ color: "#3b4654", metalness: 0.2, roughness: 0.7 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#0c0f14", metalness: 0.1, roughness: 0.6 }),
      pcb: new THREE.MeshStandardMaterial({ color: "#0b1015", metalness: 0.3, roughness: 0.55 }),
      steel: new THREE.MeshStandardMaterial({ color: "#cfd6de", metalness: 1, roughness: 0.28 }),
      gold: new THREE.MeshStandardMaterial({ color: "#e0b354", metalness: 1, roughness: 0.3 }),
      chip: new THREE.MeshStandardMaterial({ color: "#15181d", metalness: 0.2, roughness: 0.45 }),
      green: new THREE.MeshStandardMaterial({ color: "#15803d", metalness: 0.05, roughness: 0.55 }),
      white: new THREE.MeshStandardMaterial({ color: "#eef1f4", metalness: 0.05, roughness: 0.5 }),
      blue: new THREE.MeshStandardMaterial({ color: "#2563eb", metalness: 0.1, roughness: 0.42 }),
      bluePcb: new THREE.MeshStandardMaterial({ color: "#1e40af", metalness: 0.3, roughness: 0.5 }),
    }),
    [],
  );
}
type Mats = ReturnType<typeof useMaterials>;

// ---------------------------------------------------------------------------
// Selección / hover
// ---------------------------------------------------------------------------
function Selectable({
  id,
  position,
  rotation,
  ring,
  active,
  onSelect,
  children,
}: {
  id: SensorId;
  position?: Vec3;
  rotation?: Vec3;
  ring: { radius: number; y: number } | null;
  active: boolean;
  onSelect: (id: SensorId) => void;
  children: ReactNode;
}) {
  const inner = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const [hovered, setHovered] = useState(false);
  useEffect(() => () => void (document.body.style.cursor = "auto"), []);

  useFrame((_, dt) => {
    const s = THREE.MathUtils.damp(inner.current?.scale.x ?? 1, hovered || active ? 1.07 : 1, 10, dt);
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
      <group ref={inner} rotation={rotation}>
        {children}
      </group>
      {ring && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ring.y, 0]}>
          <ringGeometry args={[ring.radius, ring.radius + 0.025, 64]} />
          <meshBasicMaterial ref={ringMat} color={[0.3, 2.2, 1.9]} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Gabinete IP65
// ---------------------------------------------------------------------------
function Enclosure({ mats }: { mats: Mats }) {
  const wallH = BH - WALL;
  return (
    <group>
      <mesh material={mats.shell} position={[0, WALL / 2, 0]}>
        <boxGeometry args={[BW, WALL, BD]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} material={mats.shell} position={[0, WALL + wallH / 2, s * (BD / 2 - WALL / 2)]}>
          <boxGeometry args={[BW, wallH, WALL]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} material={mats.shell} position={[s * (BW / 2 - WALL / 2), WALL + wallH / 2, 0]}>
          <boxGeometry args={[WALL, wallH, BD - 2 * WALL]} />
        </mesh>
      ))}
      {/* torretas para tornillos y orejas de fijación */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`}>
            <mesh material={mats.shell} position={[sx * (BW / 2 - 0.1), WALL + wallH / 2, sz * (BD / 2 - 0.1)]}>
              <cylinderGeometry args={[0.055, 0.055, wallH, 20]} />
            </mesh>
            <mesh material={mats.rubber} position={[sx * (BW / 2 - 0.1), BH + 0.001, sz * (BD / 2 - 0.1)]}>
              <cylinderGeometry args={[0.022, 0.022, 0.004, 16]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function Glands({ mats }: { mats: Mats }) {
  const z0 = BD / 2;
  return (
    <group>
      {GLAND_X.map((x) => (
        <group key={x} position={[x, GLAND_Y, z0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={mats.rubber} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 6]} />
          </mesh>
          <mesh material={mats.rubber} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.058, 0.058, 0.07, 20]} />
          </mesh>
          <mesh material={mats.rubber} position={[0, 0.125, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.045, 6]} />
          </mesh>
          <mesh material={mats.rubber} position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.038, 0.055, 0.05, 20]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function useLidTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = "600 78px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(10,14,20,0.55)";
    ctx.fillText("ColdTrack", 8, 68);
    ctx.fillStyle = "rgba(200,212,226,0.75)";
    ctx.fillText("ColdTrack", 6, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

function Lid({ mats, open, status }: { mats: Mats; open: boolean; status: "ok" | "warning" | "error" }) {
  const ref = useRef<THREE.Group>(null);
  const k = useRef(0);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const tex = useLidTexture();
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(({ clock }, dt) => {
    k.current = THREE.MathUtils.damp(k.current, open ? 1 : 0, 3.5, dt);
    const e = k.current;
    ref.current?.position.set(-0.12 * e, BH + 0.05 + 0.95 * e, -0.25 * e);
    if (ref.current) ref.current.rotation.set(-0.16 * e, 0, 0.05 * e);
    if (led.current) {
      const pulse = status === "ok" ? 1 : 0.55 + 0.45 * Math.sin(clock.elapsedTime * (status === "error" ? 9 : 4));
      led.current.emissiveIntensity = 3.2 * pulse;
    }
  });

  return (
    <group ref={ref} position={[0, BH + 0.05, 0]}>
      <RoundedBox args={[BW + 0.06, 0.1, BD + 0.06]} radius={0.035} smoothness={4} material={mats.lid} />
      {/* filo luminoso inferior */}
      <mesh position={[0, -0.052, 0]}>
        <boxGeometry args={[BW + 0.02, 0.008, BD + 0.02]} />
        <meshStandardMaterial color="#0e7490" emissive="#22d3ee" emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
      {/* grabado */}
      <mesh position={[-0.28, 0.0515, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.2]} />
        <meshStandardMaterial map={tex} transparent roughness={0.6} depthWrite={false} />
      </mesh>
      {/* LED de estado */}
      <mesh position={[0.5, 0.052, 0.3]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.014, 0.07, 6, 12]} />
        <meshStandardMaterial ref={led} color={STATUS_COLOR[status]} emissive={STATUS_COLOR[status]} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Placa ESP32
// ---------------------------------------------------------------------------
function Esp32Board({ mats }: { mats: Mats }) {
  const top = 0.0125;
  const pins = 19;
  return (
    <group position={[0, 0.13, -0.05]}>
      {/* separadores */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={mats.steel} position={[sx * 0.43, -0.045, sz * 0.19]}>
            <cylinderGeometry args={[0.014, 0.014, 0.07, 10]} />
          </mesh>
        )),
      )}
      <mesh material={mats.pcb}>
        <boxGeometry args={[0.95, 0.025, 0.45]} />
      </mesh>
      {/* blindaje RF */}
      <mesh material={mats.steel} position={[-0.2, top + 0.025, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.3]} />
      </mesh>
      <mesh position={[-0.2, top + 0.0505, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#b9c1cb" metalness={1} roughness={0.42} />
      </mesh>
      {/* antena PCB (meandro) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <group key={i}>
          <mesh material={mats.gold} position={[-0.385 - i * 0.014, top + 0.002, 0]}>
            <boxGeometry args={[0.005, 0.003, 0.24]} />
          </mesh>
          {i < 5 && (
            <mesh material={mats.gold} position={[-0.392 - i * 0.014, top + 0.002, (i % 2 ? -1 : 1) * 0.1175]}>
              <boxGeometry args={[0.019, 0.003, 0.005]} />
            </mesh>
          )}
        </group>
      ))}
      {/* USB-C */}
      <mesh material={mats.steel} position={[0.455, top + 0.02, 0]}>
        <boxGeometry args={[0.08, 0.038, 0.11]} />
      </mesh>
      <mesh material={mats.chip} position={[0.496, top + 0.02, 0]}>
        <boxGeometry args={[0.004, 0.018, 0.085]} />
      </mesh>
      {/* integrados y pasivos */}
      <mesh material={mats.chip} position={[0.13, top + 0.012, 0.02]}>
        <boxGeometry args={[0.1, 0.022, 0.1]} />
      </mesh>
      <mesh material={mats.chip} position={[0.3, top + 0.014, -0.08]}>
        <boxGeometry args={[0.06, 0.028, 0.05]} />
      </mesh>
      {[-0.13, 0.13].map((z) => (
        <group key={z} position={[0.36, top + 0.012, z]}>
          <mesh material={mats.steel}>
            <boxGeometry args={[0.05, 0.022, 0.05]} />
          </mesh>
          <mesh material={mats.chip} position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.01, 12]} />
          </mesh>
        </group>
      ))}
      {[0.02, 0.07, 0.24].map((x) => (
        <mesh key={x} material={mats.steel} position={[x, top + 0.02, 0.13]}>
          <cylinderGeometry args={[0.016, 0.016, 0.04, 12]} />
        </mesh>
      ))}
      {/* LED de alimentación */}
      <mesh position={[0.27, top + 0.006, 0.06]}>
        <boxGeometry args={[0.02, 0.01, 0.012]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {/* tiras de pines */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.04, 0, s * 0.2]}>
          <mesh material={mats.chip} position={[0, top + 0.012, 0]}>
            <boxGeometry args={[0.78, 0.024, 0.03]} />
          </mesh>
          {Array.from({ length: pins }).map((_, i) => (
            <mesh key={i} material={mats.gold} position={[-0.36 + i * 0.04, top + 0.035, 0]}>
              <boxGeometry args={[0.01, 0.06, 0.01]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function TerminalBlocks({ mats }: { mats: Mats }) {
  return (
    <group>
      {[-0.35, 0.35].map((x) => (
        <group key={x} position={[x, WALL + 0.045, 0.33]}>
          <mesh material={mats.green}>
            <boxGeometry args={[0.36, 0.09, 0.09]} />
          </mesh>
          {[-0.12, -0.04, 0.04, 0.12].map((dx) => (
            <mesh key={dx} material={mats.steel} position={[dx, 0.046, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.006, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Cables y sensores
// ---------------------------------------------------------------------------
function Cables({ mats }: { mats: Mats }) {
  const geos = useMemo(
    () =>
      CABLES.map(({ gland, end }) => {
        const x = GLAND_X[gland];
        const z = BD / 2 + 0.19;
        const curve = new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(x, GLAND_Y, BD / 2 + 0.12),
            new THREE.Vector3(x, GLAND_Y, z + 0.08),
            new THREE.Vector3(THREE.MathUtils.lerp(x, end[0], 0.25), 0.05, z + 0.35),
            new THREE.Vector3(THREE.MathUtils.lerp(x, end[0], 0.7), 0.03, THREE.MathUtils.lerp(z + 0.5, end[2], 0.75) + 0.12),
            new THREE.Vector3(...end),
          ],
          false,
          "catmullrom",
          0.5,
        );
        return new THREE.TubeGeometry(curve, 80, 0.024, 12, false);
      }),
    [],
  );
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.rubber} />
      ))}
    </group>
  );
}

function Sht31({ mats }: { mats: Mats }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh material={mats.white}>
        <cylinderGeometry args={[0.075, 0.075, 0.3, 28]} />
      </mesh>
      {[-0.09, -0.045, 0, 0.045, 0.09].map((y) => (
        <mesh key={y} material={mats.chip} position={[0, y - 0.02, 0]}>
          <cylinderGeometry args={[0.077, 0.077, 0.014, 28]} />
        </mesh>
      ))}
      <mesh material={mats.white} position={[0, -0.16, 0]}>
        <sphereGeometry args={[0.075, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      <mesh material={mats.rubber} position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.05, 16]} />
      </mesh>
    </group>
  );
}

function Reed({ mats }: { mats: Mats }) {
  return (
    <group>
      {[-0.065, 0.065].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <RoundedBox args={[0.34, 0.09, 0.11]} radius={0.015} smoothness={3} material={mats.white} />
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} material={mats.steel} position={[x, 0.046, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.004, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Sct013({ mats }: { mats: Mats }) {
  const geo = useMemo(() => {
    const s = 0.19;
    const r = 0.04;
    const shape = new THREE.Shape();
    shape.moveTo(-s + r, -s);
    shape.lineTo(s - r, -s);
    shape.quadraticCurveTo(s, -s, s, -s + r);
    shape.lineTo(s, s - r);
    shape.quadraticCurveTo(s, s, s - r, s);
    shape.lineTo(-s + r, s);
    shape.quadraticCurveTo(-s, s, -s, s - r);
    shape.lineTo(-s, -s + r);
    shape.quadraticCurveTo(-s, -s, -s + r, -s);
    const hole = new THREE.Path();
    hole.absarc(0, 0.03, 0.095, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 32 });
    g.translate(0, 0, -0.08);
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group rotation={[0, -0.5, 0]}>
      <mesh geometry={geo} material={mats.blue} />
      {/* línea de partición y traba */}
      <mesh material={mats.chip} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.405, 0.006, 0.19]} />
      </mesh>
      <mesh material={mats.blue} position={[0.2, 0.0, 0]}>
        <boxGeometry args={[0.03, 0.12, 0.1]} />
      </mesh>
    </group>
  );
}

function Mpu6050({ mats }: { mats: Mats }) {
  return (
    <group rotation={[0, 0.35, 0]}>
      <mesh material={mats.bluePcb}>
        <boxGeometry args={[0.26, 0.02, 0.19]} />
      </mesh>
      <mesh material={mats.chip} position={[0.02, 0.018, 0]}>
        <boxGeometry args={[0.055, 0.016, 0.055]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} material={mats.gold} position={[-0.105, 0.012, -0.07 + i * 0.02]}>
          <cylinderGeometry args={[0.007, 0.007, 0.006, 10]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.steel} position={[0.1, 0.012, s * 0.065]}>
          <cylinderGeometry args={[0.016, 0.016, 0.004, 14]} />
        </mesh>
      ))}
      <mesh position={[0.06, 0.014, 0.06]}>
        <boxGeometry args={[0.014, 0.008, 0.01]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------
function CameraRig({ active }: { active: SensorId | null }) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  useEffect(() => {
    const v = VIEWS[active ?? "default"];
    controls.current?.setLookAt(...v.pos, ...v.target, true);
  }, [active]);
  return <CameraControls ref={controls} makeDefault minDistance={0.8} maxDistance={10} maxPolarAngle={Math.PI / 2.05} smoothTime={0.35} />;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function Scene({
  active,
  open,
  status,
  onSelect,
  modelUrl,
}: {
  active: SensorId | null;
  open: boolean;
  status: "ok" | "warning" | "error";
  onSelect: (id: SensorId) => void;
  modelUrl?: string;
}) {
  const mats = useMaterials();
  return (
    <>
      <color attach="background" args={["#0b1220"]} />
      <fog attach="fog" args={["#0f1a2e", 9, 22]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} />
      <pointLight position={[-3, 2, -2]} intensity={10} color="#22d3ee" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.5} position={[-5, 2, 1]} scale={[3, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 2, 2]} scale={[3, 6, 1]} rotation={[0, -Math.PI / 2, 0]} color="#a5f3fc" />
      </Environment>

      {modelUrl ? (
        <Suspense fallback={null}>
          <GltfModel url={modelUrl} />
        </Suspense>
      ) : (
        <group>
          <Enclosure mats={mats} />
          <Glands mats={mats} />
          <Lid mats={mats} open={open} status={status} />
          <TerminalBlocks mats={mats} />
          <Selectable id="esp32" ring={null} active={active === "esp32"} onSelect={onSelect}>
            <Esp32Board mats={mats} />
          </Selectable>
          <Cables mats={mats} />
          <Selectable id="sht31" position={SENSOR_POS.sht31} rotation={[0, 0.4, 0]} ring={{ radius: 0.27, y: -0.07 }} active={active === "sht31"} onSelect={onSelect}>
            <Sht31 mats={mats} />
          </Selectable>
          <Selectable id="reed" position={SENSOR_POS.reed} ring={{ radius: 0.27, y: -0.04 }} active={active === "reed"} onSelect={onSelect}>
            <Reed mats={mats} />
          </Selectable>
          <Selectable id="sct013" position={SENSOR_POS.sct013} ring={{ radius: 0.33, y: -0.185 }} active={active === "sct013"} onSelect={onSelect}>
            <Sct013 mats={mats} />
          </Selectable>
          <Selectable id="mpu6050" position={SENSOR_POS.mpu6050} ring={{ radius: 0.22, y: -0.005 }} active={active === "mpu6050"} onSelect={onSelect}>
            <Mpu6050 mats={mats} />
          </Selectable>
        </group>
      )}

      <ContactShadows position={[0, 0.001, 0.4]} opacity={0.6} scale={9} blur={2.4} far={2.5} />
      <Grid position={[0, 0, 0]} infiniteGrid cellSize={0.25} sectionSize={1} cellColor="#12384a" sectionColor="#1c6c7a" fadeDistance={14} fadeStrength={2} />
      <CameraRig active={active} />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
      </EffectComposer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function ColdTrackSensor3D({ activeSensor, onSelectSensor, telemetryStatus = "ok", modelUrl, className = "" }: ColdTrackSensor3DProps) {
  const controlled = activeSensor !== undefined;
  const [internal, setInternal] = useState<SensorId | null>(null);
  const [open, setOpen] = useState(false);
  const active = controlled ? (activeSensor ?? null) : internal;

  const select = (id: SensorId | null) => {
    const next = id !== null && id === active ? null : id;
    if (!controlled) setInternal(next);
    onSelectSensor?.(next);
    if (next === "esp32") setOpen(true);
  };

  useEffect(() => {
    if (activeSensor === "esp32") setOpen(true);
  }, [activeSensor]);

  const info = active ? SENSOR_INFO[active] : null;

  return (
    <div className={`relative h-full min-h-[520px] w-full overflow-hidden rounded-xl bg-[#0b1220] ${className}`}>
      <Canvas dpr={DPR} camera={CAMERA} onPointerMissed={() => select(null)}>
        <Scene active={active} open={open} status={telemetryStatus} onSelect={select} modelUrl={modelUrl} />
      </Canvas>

      {/* Título y estado */}
      <div className="pointer-events-none absolute left-5 top-4">
        <h3 className="text-lg font-medium text-slate-100">Sensor IoT ColdTrack</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[telemetryStatus] }} />
          {STATUS_LABEL[telemetryStatus]}
        </p>
      </div>

      {/* Toggle tapa */}
      <button
        type="button"
        role="switch"
        aria-checked={open}
        onClick={() => setOpen(!open)}
        className="absolute right-4 top-4 flex items-center gap-2.5 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 backdrop-blur hover:text-white"
      >
        Abrir tapa / Despiece
        <span className={`relative h-4 w-8 rounded-full transition-colors ${open ? "bg-emerald-500" : "bg-slate-600"}`}>
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${open ? "left-[18px]" : "left-0.5"}`} />
        </span>
      </button>

      {/* Tarjeta del componente seleccionado */}
      {info && (
        <div className="absolute bottom-16 left-4 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-white/10 bg-slate-900/85 p-3.5 backdrop-blur">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
              <info.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100">{info.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{info.model}</p>
            </div>
            <button type="button" onClick={() => select(null)} aria-label="Cerrar" className="text-slate-400 hover:text-white">
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
              onClick={() => select(id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${
                on ? "bg-cyan-500 font-medium text-slate-950" : "text-slate-200 hover:bg-white/10"
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
