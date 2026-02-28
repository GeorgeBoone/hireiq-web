// src/HireIQLogo.tsx
// HireIQ dot-burst logo SVG component

interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function HireIQLogo({
  size = 40,
  color = "#818cf8",
  style,
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Center dot */}
      <circle cx="50" cy="50" r="4" fill={color} />

      {/* ── Cardinal arms (up, down, left, right) ── */}

      {/* Up */}
      <circle cx="50" cy="41" r="3.5" fill={color} />
      <circle cx="50" cy="32" r="3" fill={color} />
      <circle cx="50" cy="24" r="2.5" fill={color} />
      <circle cx="50" cy="17" r="2" fill={color} />
      <circle cx="50" cy="11" r="1.5" fill={color} />

      {/* Down */}
      <circle cx="50" cy="59" r="3.5" fill={color} />
      <circle cx="50" cy="68" r="3" fill={color} />
      <circle cx="50" cy="76" r="2.5" fill={color} />
      <circle cx="50" cy="83" r="2" fill={color} />
      <circle cx="50" cy="89" r="1.5" fill={color} />

      {/* Left */}
      <circle cx="41" cy="50" r="3.5" fill={color} />
      <circle cx="32" cy="50" r="3" fill={color} />
      <circle cx="24" cy="50" r="2.5" fill={color} />
      <circle cx="17" cy="50" r="2" fill={color} />
      <circle cx="11" cy="50" r="1.5" fill={color} />

      {/* Right */}
      <circle cx="59" cy="50" r="3.5" fill={color} />
      <circle cx="68" cy="50" r="3" fill={color} />
      <circle cx="76" cy="50" r="2.5" fill={color} />
      <circle cx="83" cy="50" r="2" fill={color} />
      <circle cx="89" cy="50" r="1.5" fill={color} />

      {/* ── Diagonal arms ── */}

      {/* Up-Left */}
      <circle cx="43.5" cy="43.5" r="3.2" fill={color} />
      <circle cx="37" cy="37" r="2.8" fill={color} />
      <circle cx="31" cy="31" r="2.3" fill={color} />
      <circle cx="25.5" cy="25.5" r="1.8" fill={color} />
      <circle cx="20.5" cy="20.5" r="1.4" fill={color} />

      {/* Up-Right */}
      <circle cx="56.5" cy="43.5" r="3.2" fill={color} />
      <circle cx="63" cy="37" r="2.8" fill={color} />
      <circle cx="69" cy="31" r="2.3" fill={color} />
      <circle cx="74.5" cy="25.5" r="1.8" fill={color} />
      <circle cx="79.5" cy="20.5" r="1.4" fill={color} />

      {/* Down-Left */}
      <circle cx="43.5" cy="56.5" r="3.2" fill={color} />
      <circle cx="37" cy="63" r="2.8" fill={color} />
      <circle cx="31" cy="69" r="2.3" fill={color} />
      <circle cx="25.5" cy="74.5" r="1.8" fill={color} />
      <circle cx="20.5" cy="79.5" r="1.4" fill={color} />

      {/* Down-Right */}
      <circle cx="56.5" cy="56.5" r="3.2" fill={color} />
      <circle cx="63" cy="63" r="2.8" fill={color} />
      <circle cx="69" cy="69" r="2.3" fill={color} />
      <circle cx="74.5" cy="74.5" r="1.8" fill={color} />
      <circle cx="79.5" cy="79.5" r="1.4" fill={color} />

      {/* ── Secondary dots (between cardinal and diagonal) ── */}

      {/* Between Up and Up-Right */}
      <circle cx="53.5" cy="42" r="2.2" fill={color} opacity="0.7" />
      <circle cx="57" cy="34" r="1.8" fill={color} opacity="0.6" />
      <circle cx="60" cy="27" r="1.4" fill={color} opacity="0.5" />

      {/* Between Up and Up-Left */}
      <circle cx="46.5" cy="42" r="2.2" fill={color} opacity="0.7" />
      <circle cx="43" cy="34" r="1.8" fill={color} opacity="0.6" />
      <circle cx="40" cy="27" r="1.4" fill={color} opacity="0.5" />

      {/* Between Down and Down-Right */}
      <circle cx="53.5" cy="58" r="2.2" fill={color} opacity="0.7" />
      <circle cx="57" cy="66" r="1.8" fill={color} opacity="0.6" />
      <circle cx="60" cy="73" r="1.4" fill={color} opacity="0.5" />

      {/* Between Down and Down-Left */}
      <circle cx="46.5" cy="58" r="2.2" fill={color} opacity="0.7" />
      <circle cx="43" cy="66" r="1.8" fill={color} opacity="0.6" />
      <circle cx="40" cy="73" r="1.4" fill={color} opacity="0.5" />

      {/* Between Left and Up-Left */}
      <circle cx="42" cy="46.5" r="2.2" fill={color} opacity="0.7" />
      <circle cx="34" cy="43" r="1.8" fill={color} opacity="0.6" />
      <circle cx="27" cy="40" r="1.4" fill={color} opacity="0.5" />

      {/* Between Left and Down-Left */}
      <circle cx="42" cy="53.5" r="2.2" fill={color} opacity="0.7" />
      <circle cx="34" cy="57" r="1.8" fill={color} opacity="0.6" />
      <circle cx="27" cy="60" r="1.4" fill={color} opacity="0.5" />

      {/* Between Right and Up-Right */}
      <circle cx="58" cy="46.5" r="2.2" fill={color} opacity="0.7" />
      <circle cx="66" cy="43" r="1.8" fill={color} opacity="0.6" />
      <circle cx="73" cy="40" r="1.4" fill={color} opacity="0.5" />

      {/* Between Right and Down-Right */}
      <circle cx="58" cy="53.5" r="2.2" fill={color} opacity="0.7" />
      <circle cx="66" cy="57" r="1.8" fill={color} opacity="0.6" />
      <circle cx="73" cy="60" r="1.4" fill={color} opacity="0.5" />
    </svg>
  );
}
