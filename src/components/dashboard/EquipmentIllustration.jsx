import React, { useId } from "react";

/**
 * Ilustración isométrica sobria de un equipo de frío.
 * type: "upright" (vitrina vertical) | "chest" (freezer horizontal)
 * open: dibuja la puerta abierta (solo vitrina).
 */
export function EquipmentIllustration({ type = "upright", doors = 2, open = false, className = "" }) {
  const id = useId().replace(/:/g, "");
  return type === "chest" ? (
    <Chest id={id} className={className} />
  ) : (
    <Upright id={id} doors={doors} open={open} className={className} />
  );
}

// Isométrico real: cara derecha (f) y cara izquierda (s) a 30°.
const FX = 0.866;
const FY = -0.5;
const SX = 0.866;
const SY = 0.5;
const PAD = 6;

function projection(Wf, Ws, H, extraRight = 0) {
  const nx = PAD + 10 + Ws * SX;
  const ny = PAD + Wf * -FY + Ws * SY;
  const ox = nx - Ws * SX;
  const oy = ny - Ws * SY;
  return {
    nx,
    ny,
    front: `matrix(${FX} ${FY} 0 1 ${nx} ${ny})`,
    side: `matrix(${SX} ${SY} 0 1 ${ox} ${oy})`,
    top: `matrix(${SX} ${SY} ${FX} ${FY} ${ox} ${oy})`,
    floor: `matrix(${SX} ${SY} ${FX} ${FY} ${ox} ${oy + H})`,
    viewBox: `0 0 ${nx + Wf * FX + PAD + extraRight} ${ny + H + PAD + 4}`,
  };
}

const NAVY = "#25324d";
const EDGE = { stroke: "#c5ced9", strokeWidth: 0.6 };

function Defs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#cdd5df" />
        <stop offset="1" stopColor="#e3e8ee" />
      </linearGradient>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#eef2f6" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#eef8fd" />
        <stop offset="1" stopColor="#c6e2f2" />
      </linearGradient>
      <filter id={`${id}-blur`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
  );
}

function Shadow({ id, m, Ws, Wf }) {
  return (
    <g transform={m.floor}>
      <rect x="-10" y="-2" width={Ws + 12} height={Wf + 2} rx="6" fill="#64748b" opacity="0.28" filter={`url(#${id}-blur)`} />
    </g>
  );
}

function Shelves({ x, y, w, h }) {
  return [1, 2, 3, 4].map((k) => {
    const sy = y + (h * k) / 5;
    return (
      <g key={k}>
        <rect x={x} y={sy} width={w} height="2" fill="#ffffff" />
        <rect x={x} y={sy + 2} width={w} height="1" fill="#7c8ba1" opacity="0.35" />
      </g>
    );
  });
}

function Upright({ id, doors, open, className }) {
  const Wf = doors === 1 ? 46 : 62;
  const Ws = 50;
  const H = 140;
  const doorTop = 19;
  const doorH = H - doorTop - 12;
  const dw = (Wf - 6 + 1.5) / doors;
  const m = projection(Wf, Ws, H, open ? dw * SX : 0);
  const u = (n) => `url(#${id}-${n})`;

  return (
    <svg viewBox={m.viewBox} className={className} role="img" aria-hidden="true">
      <Defs id={id} />
      <Shadow id={id} m={m} Ws={Ws} Wf={Wf} />

      <g transform={m.side}>
        <rect width={Ws} height={H} fill={u("side")} {...EDGE} />
      </g>
      <g transform={m.top}>
        <rect width={Ws} height={Wf} fill="#ffffff" {...EDGE} />
      </g>

      <g transform={m.front}>
        <rect width={Wf} height={H} fill={u("face")} {...EDGE} />
        {/* cabecera */}
        <rect x="3" y="3" width={Wf - 6} height="13" rx="1" fill="#bfe1f3" />
        {/* zócalo */}
        <rect x="0" y={H - 10} width={Wf} height="10" fill={NAVY} />

        {Array.from({ length: doors }).map((_, i) => {
          const x = 3 + i * dw;
          const w = dw - 1.5;
          const isOpen = open && i === doors - 1;
          return (
            <g key={i}>
              <rect x={x} y={doorTop} width={w} height={doorH} rx="1" fill={NAVY} />
              <rect x={x + 3} y={doorTop + 3} width={w - 6} height={doorH - 6} fill={isOpen ? "#d6e6f0" : u("glass")} />
              <Shelves x={x + 3} y={doorTop + 3} w={w - 6} h={doorH - 6} />
              {!isOpen && (
                <>
                  <polygon
                    points={`${x + 5},${doorTop + 5} ${x + w * 0.5},${doorTop + 5} ${x + 5},${doorTop + doorH * 0.42}`}
                    fill="#fff"
                    opacity="0.45"
                  />
                  <rect x={i === 0 && doors === 2 ? x + w - 2.4 : x + 0.8} y={doorTop + doorH / 2 - 11} width="1.6" height="22" rx="0.8" fill="#dbe3ec" />
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* puerta abierta, abisagrada en el borde derecho */}
      {open && (
        <g transform={`matrix(${SX} ${SY} 0 1 ${m.nx + FX * (Wf - 1.5)} ${m.ny + FY * (Wf - 1.5) + doorTop})`}>
          <rect width={dw - 1.5} height={doorH} rx="1" fill={NAVY} />
          <rect x="3" y="3" width={dw - 7.5} height={doorH - 6} fill="#e3f2fa" opacity="0.8" />
          <polygon points={`5,5 ${dw * 0.5},5 5,${doorH * 0.42}`} fill="#fff" opacity="0.5" />
          <rect x={dw - 4.2} y={doorH / 2 - 11} width="1.6" height="22" rx="0.8" fill="#dbe3ec" />
        </g>
      )}
    </svg>
  );
}

function Chest({ id, className }) {
  const Wf = 62; // cara derecha (corta)
  const Ws = 122; // cara izquierda (larga)
  const H = 50;
  const m = projection(Wf, Ws, H);
  const u = (n) => `url(#${id}-${n})`;
  const paneW = (Ws - 12) / 2;

  return (
    <svg viewBox={m.viewBox} className={className} role="img" aria-hidden="true">
      <Defs id={id} />
      <Shadow id={id} m={m} Ws={Ws} Wf={Wf} />

      {/* cara larga */}
      <g transform={m.side}>
        <rect width={Ws} height={H} rx="2" fill={u("face")} {...EDGE} />
        <rect y={H - 5} width={Ws} height="5" fill="#cfd7e1" />
      </g>

      {/* cara corta con rejilla */}
      <g transform={m.front}>
        <rect width={Wf} height={H} rx="2" fill="#e4e9ef" {...EDGE} />
        <rect y={H - 5} width={Wf} height="5" fill="#bcc6d2" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={Wf - 22} y={H - 19 + i * 3.6} width="14" height="1.5" rx="0.7" fill="#8e9bad" />
        ))}
      </g>

      {/* tapa con vidrios corredizos */}
      <g transform={m.top}>
        <rect width={Ws} height={Wf} rx="3" fill="#93a7bd" stroke="#7d91a8" strokeWidth="0.6" />
        {[0, 1].map((i) => {
          const x = 4 + i * (paneW + 4);
          return (
            <g key={i}>
              <rect x={x} y="4" width={paneW} height={Wf - 8} rx="2" fill={u("glass")} />
              <polygon points={`${x + 4},${Wf - 8} ${x + paneW * 0.45},${Wf - 8} ${x + 4},${Wf * 0.4}`} fill="#fff" opacity="0.5" />
              <rect x={x + paneW - 5} y={Wf / 2 - 7} width="1.8" height="14" rx="0.9" fill="#7d91a8" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
