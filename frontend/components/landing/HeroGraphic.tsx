"use client";

export function HeroGraphic() {
  return (
    <div className="relative flex items-center justify-center select-none" aria-hidden>
      {/* Outer ambient glow — copper */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(200,131,63,0.12) 0%, rgba(110,144,178,0.05) 45%, transparent 70%)",
          filter: "blur(32px)",
        }}
      />
      {/* Secondary steel glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 55%, rgba(110,144,178,0.07) 0%, transparent 65%)",
          filter: "blur(20px)",
        }}
      />

      <div className="animate-float relative">
        <ShieldSVG />
      </div>
    </div>
  );
}

function ShieldSVG() {
  return (
    <svg
      width="380"
      height="420"
      viewBox="0 0 380 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="copper-grad" x1="190" y1="20" x2="190" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0A060" stopOpacity="0.90" />
          <stop offset="50%" stopColor="#C8833F" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#C8833F" stopOpacity="0.20" />
        </linearGradient>

        <linearGradient id="steel-grad" x1="190" y1="80" x2="190" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#90B4D0" stopOpacity="0.70" />
          <stop offset="100%" stopColor="#6E90B2" stopOpacity="0.20" />
        </linearGradient>

        <linearGradient id="chip-grad" x1="166" y1="185" x2="214" y2="235" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1E28" />
          <stop offset="100%" stopColor="#151519" />
        </linearGradient>

        <clipPath id="shield-clip">
          <path d="M 190,30 L 334,82 L 334,210 Q 334,318 190,386 Q 46,318 46,210 L 46,82 Z" />
        </clipPath>

        <filter id="glow-copper" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Far outer ring ─────────────────────── */}
      <ellipse cx="190" cy="210" rx="170" ry="185" stroke="url(#copper-grad)" strokeWidth="0.4" opacity="0.10" />
      <ellipse cx="190" cy="210" rx="155" ry="168" stroke="url(#copper-grad)" strokeWidth="0.3" opacity="0.07" />

      {/* ── Grid of dots ───────────────────────── */}
      {[...Array(7)].map((_, row) =>
        [...Array(7)].map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={92 + col * 36}
            cy={90 + row * 44}
            r="0.9"
            fill="#C8833F"
            opacity="0.10"
          />
        ))
      )}

      {/* ── Outer shield ──────────────────────── */}
      <path
        d="M 190,30 L 334,82 L 334,210 Q 334,318 190,386 Q 46,318 46,210 L 46,82 Z"
        stroke="url(#copper-grad)"
        strokeWidth="1.5"
        fill="rgba(200,131,63,0.025)"
        style={{
          strokeDasharray: 1100,
          strokeDashoffset: 0,
          animation: "drawPath 2.4s cubic-bezier(0.4,0,0.2,1) forwards",
        }}
      />

      {/* ── Mid shield (steel) ─────────────────── */}
      <path
        d="M 190,72 L 292,108 L 292,206 Q 292,288 190,344 Q 88,288 88,206 L 88,108 Z"
        stroke="url(#steel-grad)"
        strokeWidth="1"
        fill="none"
        style={{
          strokeDasharray: 900,
          strokeDashoffset: 0,
          animation: "drawPath 2.1s 0.45s cubic-bezier(0.4,0,0.2,1) forwards",
          opacity: 0.65,
        }}
      />

      {/* ── Inner shield ───────────────────────── */}
      <path
        d="M 190,114 L 252,136 L 252,202 Q 252,256 190,290 Q 128,256 128,202 L 128,136 Z"
        stroke="#C8833F"
        strokeWidth="0.8"
        fill="rgba(200,131,63,0.04)"
        opacity="0.55"
        style={{
          strokeDasharray: 680,
          strokeDashoffset: 0,
          animation: "drawPath 1.9s 0.8s cubic-bezier(0.4,0,0.2,1) forwards",
        }}
      />

      {/* ── Central chip body ──────────────────── */}
      <rect
        x="166"
        y="186"
        width="48"
        height="48"
        rx="5"
        fill="url(#chip-grad)"
        stroke="url(#steel-grad)"
        strokeWidth="1"
        filter="url(#glow-copper)"
      />

      {/* Chip inner circuit lines */}
      <line x1="174" y1="194" x2="206" y2="194" stroke="#6E90B2" strokeWidth="0.6" opacity="0.4" />
      <line x1="174" y1="210" x2="206" y2="210" stroke="#6E90B2" strokeWidth="0.6" opacity="0.4" />
      <line x1="174" y1="226" x2="206" y2="226" stroke="#6E90B2" strokeWidth="0.6" opacity="0.4" />
      <line x1="182" y1="186" x2="182" y2="234" stroke="#6E90B2" strokeWidth="0.6" opacity="0.3" />
      <line x1="198" y1="186" x2="198" y2="234" stroke="#6E90B2" strokeWidth="0.6" opacity="0.3" />

      {/* Chip pins — top */}
      <line x1="176" y1="186" x2="176" y2="176" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      <line x1="190" y1="186" x2="190" y2="176" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      <line x1="204" y1="186" x2="204" y2="176" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      {/* Chip pins — bottom */}
      <line x1="176" y1="234" x2="176" y2="244" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      <line x1="190" y1="234" x2="190" y2="244" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      <line x1="204" y1="234" x2="204" y2="244" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      {/* Chip pins — left */}
      <line x1="166" y1="200" x2="156" y2="200" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      <line x1="166" y1="210" x2="156" y2="210" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      {/* Chip pins — right */}
      <line x1="214" y1="200" x2="224" y2="200" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />
      <line x1="214" y1="210" x2="224" y2="210" stroke="#6E90B2" strokeWidth="0.9" opacity="0.55" />

      {/* Lock icon centered in chip */}
      <rect x="181" y="203" width="18" height="13" rx="2" stroke="#C8833F" strokeWidth="1" fill="none" />
      <path d="M 185,203 L 185,199.5 Q 185,196 190,196 Q 195,196 195,199.5 L 195,203" stroke="#C8833F" strokeWidth="1" fill="none" />
      <circle cx="190" cy="209" r="1.8" fill="#C8833F" opacity="0.9" />

      {/* ── Corner accent marks ────────────────── */}
      <g stroke="rgba(200,131,63,0.40)" strokeWidth="1" fill="none">
        <path d="M 55,92 L 55,80 L 67,80" />
        <path d="M 325,92 L 325,80 L 313,80" />
        <path d="M 68,376 L 56,376 L 56,364" />
        <path d="M 312,376 L 324,376 L 324,364" />
      </g>

      {/* ── Diagonal accent lines ─────────────── */}
      <line x1="46" y1="82" x2="66" y2="102" stroke="rgba(200,131,63,0.15)" strokeWidth="0.5" />
      <line x1="334" y1="82" x2="314" y2="102" stroke="rgba(200,131,63,0.15)" strokeWidth="0.5" />

      {/* ── Scanning line ─────────────────────── */}
      <g clipPath="url(#shield-clip)">
        <line
          x1="46"
          y1="210"
          x2="334"
          y2="210"
          stroke="url(#copper-grad)"
          strokeWidth="0.6"
          opacity="0.5"
          style={{
            animation: "scanLine 4.5s 1.8s ease-in-out infinite alternate",
          }}
        />
      </g>

      {/* ── Status indicator row ───────────────── */}
      <circle cx="190" cy="362" r="3.5" fill="#4D9170" opacity="0.85" />
      <circle cx="177" cy="370" r="2.5" fill="#C8833F" opacity="0.55" />
      <circle cx="203" cy="370" r="2.5" fill="#6E90B2" opacity="0.55" />

      {/* ── FHE label ─────────────────────────── */}
      <text
        x="190"
        y="400"
        textAnchor="middle"
        fontSize="8"
        fontFamily="monospace"
        fill="#C8833F"
        opacity="0.35"
        letterSpacing="2"
      >
        COFHE
      </text>
    </svg>
  );
}
