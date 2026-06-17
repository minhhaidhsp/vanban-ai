const DOTS: { x: number; y: number; delay: number }[] = [
  // top-left cluster
  { x: 52,   y: 32,  delay: 0.0 },
  { x: 128,  y: 75,  delay: 0.4 },
  { x: 195,  y: 48,  delay: 0.8 },
  { x: 85,   y: 148, delay: 1.2 },
  { x: 175,  y: 195, delay: 0.6 },
  { x: 30,   y: 212, delay: 1.6 },
  // top-right cluster
  { x: 1355, y: 38,  delay: 0.3 },
  { x: 1282, y: 88,  delay: 0.9 },
  { x: 1395, y: 155, delay: 1.5 },
  { x: 1312, y: 196, delay: 0.2 },
  { x: 1212, y: 58,  delay: 1.1 },
  // bottom-left cluster
  { x: 65,   y: 518, delay: 0.7 },
  { x: 155,  y: 558, delay: 1.3 },
  { x: 95,   y: 448, delay: 0.5 },
  { x: 205,  y: 510, delay: 1.9 },
  // bottom-right cluster
  { x: 1385, y: 528, delay: 1.0 },
  { x: 1298, y: 558, delay: 0.1 },
  { x: 1358, y: 468, delay: 1.7 },
  { x: 1208, y: 538, delay: 0.8 },
  // side accents
  { x: 28,   y: 298, delay: 2.1 },
  { x: 1412, y: 292, delay: 1.4 },
];

// Pairs of dot indices to connect with lines (only nearby dots)
const LINES: [number, number][] = [
  // top-left network
  [0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5],
  // top-right network
  [6, 7], [6, 10], [7, 8], [7, 9], [8, 9],
  // bottom-left network
  [11, 12], [11, 13], [12, 14], [13, 14],
  // bottom-right network
  [15, 16], [15, 17], [16, 18],
];

export function HeroPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full text-brand-400"
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Connecting lines — lower opacity */}
      <g opacity="0.22" stroke="currentColor" strokeWidth="0.6" fill="none">
        {LINES.map(([a, b], i) => (
          <line
            key={i}
            x1={DOTS[a].x} y1={DOTS[a].y}
            x2={DOTS[b].x} y2={DOTS[b].y}
          />
        ))}
      </g>

      {/* Dots with staggered pulse animation */}
      {DOTS.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r="1.8"
          fill="currentColor"
          className="animate-pulse-dot"
          style={{ animationDelay: `${dot.delay}s` }}
        />
      ))}
    </svg>
  );
}
