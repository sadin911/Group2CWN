interface Props {
  className?: string;
  size?: number;
}

export function MasterBallIcon({ className = 'w-6 h-6', size }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Master Ball Purple Gradient */}
        <radialGradient id="mbPurple" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#9D4EDD" />
          <stop offset="50%" stopColor="#7B2CBF" />
          <stop offset="100%" stopColor="#4A154B" />
        </radialGradient>

        {/* Master Ball Pink Bump Gradient */}
        <radialGradient id="mbPink" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FF70A6" />
          <stop offset="70%" stopColor="#E01E5A" />
          <stop offset="100%" stopColor="#A00030" />
        </radialGradient>

        {/* Bottom White Dome Gradient */}
        <linearGradient id="mbWhite" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Center Button Metallic Gradient */}
        <radialGradient id="mbCenter" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </radialGradient>
      </defs>

      {/* Outer Ball Circle Clipping Mask / Shadow */}
      <circle cx="50" cy="50" r="48" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />

      {/* Top Half (Purple Dome) */}
      <path
        d="M 2 50 A 48 48 0 0 1 98 50 Z"
        fill="url(#mbPurple)"
      />

      {/* Left Pink Accent Bump */}
      <circle cx="25" cy="30" r="14" fill="url(#mbPink)" />
      <circle cx="23" cy="27" r="4" fill="white" opacity="0.5" />

      {/* Right Pink Accent Bump */}
      <circle cx="75" cy="30" r="14" fill="url(#mbPink)" />
      <circle cx="73" cy="27" r="4" fill="white" opacity="0.5" />

      {/* Iconic Master Ball White "M" Letter */}
      <path
        d="M 36 34 L 43 18 L 50 26 L 57 18 L 64 34 L 59 34 L 55 25 L 50 31 L 45 25 L 41 34 Z"
        fill="#FFFFFF"
        stroke="#3B0764"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Bottom Half (White Dome) */}
      <path
        d="M 2 50 A 48 48 0 0 0 98 50 Z"
        fill="url(#mbWhite)"
      />

      {/* Horizontal Black Belt Line */}
      <rect x="2" y="46" width="96" height="8" fill="#0F172A" />

      {/* Outer Center Ring */}
      <circle cx="50" cy="50" r="14" fill="#0F172A" />

      {/* Center White/Metallic Button */}
      <circle cx="50" cy="50" r="9" fill="url(#mbCenter)" stroke="#334155" strokeWidth="1" />

      {/* Inner Push Dot */}
      <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
    </svg>
  );
}
