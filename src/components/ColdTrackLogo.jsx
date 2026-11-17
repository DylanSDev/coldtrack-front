import React, { useId } from "react";

const BRAND_BLUE = "#034AAD";

const OUTER =
  "M54 0Q41.57 17.22 38.18 38.18Q17.22 41.57 0 54Q-17.22 41.57 -38.18 38.18Q-41.57 17.22 -54 0Q-41.57 -17.22 -38.18 -38.18Q-17.22 -41.57 0 -54Q17.22 -41.57 38.18 -38.18Q41.57 -17.22 54 0Z";
const STAR = "M0 -15Q4 -4 15 0Q4 4 0 15Q-4 4 -15 0Q-4 -4 0 -15Z";

/** Marca (sin fondo) para incrustar dentro de otro SVG. Radio ≈ 54 unidades, centrada en 0,0. */
export function ColdTrackMark({ fill = "#fff", transform }) {
  const id = useId().replace(/:/g, "");
  return (
    <g transform={transform}>
      <defs>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120">
          <path d={OUTER} fill="#fff" />
          <circle r="25" fill="#000" />
          {[0, 45, 90, 135].map((a) => (
            <line key={a} x1="-60" x2="60" y1="0" y2="0" stroke="#000" strokeWidth="11.6" transform={`rotate(${a})`} />
          ))}
        </mask>
      </defs>
      <rect x="-60" y="-60" width="120" height="120" fill={fill} mask={`url(#${id}-m)`} />
      <path d={STAR} fill={fill} />
    </g>
  );
}

/**
 * Logo de ColdTrack.
 * tile=true: marca blanca sobre mosaico azul redondeado.
 * tile=false: solo la marca, usando currentColor.
 */
export function ColdTrackLogo({ className = "", tile = true }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="ColdTrack">
      {tile && <rect width="100" height="100" rx="24" fill={BRAND_BLUE} />}
      <ColdTrackMark fill={tile ? "#fff" : "currentColor"} transform={`translate(50 50) scale(${tile ? 0.7 : 0.92})`} />
    </svg>
  );
}
