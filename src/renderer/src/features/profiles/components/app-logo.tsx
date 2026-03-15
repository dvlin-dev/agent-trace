interface AppLogoProps {
  size?: number;
}

export function AppLogo({ size = 56 }: AppLogoProps) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      className="shadow-[0_4px_20px_rgba(226,130,43,0.2)]"
    >
      <defs>
        <clipPath id="logo-clip">
          <rect width="1024" height="1024" rx="228" ry="228" />
        </clipPath>
      </defs>
      <g clipPath="url(#logo-clip)">
        <rect width="1024" height="1024" fill="#141414" />
        <g stroke="#fff" strokeOpacity="0.03" strokeWidth="1">
          <line x1="0" y1="256" x2="1024" y2="256" />
          <line x1="0" y1="512" x2="1024" y2="512" />
          <line x1="0" y1="768" x2="1024" y2="768" />
          <line x1="256" y1="0" x2="256" y2="1024" />
          <line x1="512" y1="0" x2="512" y2="1024" />
          <line x1="768" y1="0" x2="768" y2="1024" />
        </g>
        <polyline
          points="120,580 280,580 340,580 380,300 460,720 540,300 620,720 680,440 740,440 904,440"
          fill="none"
          stroke="#E2822B"
          strokeWidth="56"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <rect x="904" y="408" width="8" height="64" fill="#E2822B" opacity="0.6" />
        <line
          x1="120" y1="512" x2="904" y2="512"
          stroke="#fff" strokeOpacity="0.06" strokeWidth="2"
          strokeDasharray="8,12"
        />
      </g>
    </svg>
  );
}
