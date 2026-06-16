type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Marca: flor de 4 pétalas (eco do logo São João) */
export function IconLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <g transform="rotate(45 12 12)">
        <ellipse cx="12" cy="6.6" rx="2.1" ry="3.7" />
        <ellipse cx="12" cy="17.4" rx="2.1" ry="3.7" />
        <ellipse cx="6.6" cy="12" rx="3.7" ry="2.1" />
        <ellipse cx="17.4" cy="12" rx="3.7" ry="2.1" />
      </g>
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}

export function IconClipboard({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 5.25H7.5A2.25 2.25 0 005.25 7.5v11.25A2.25 2.25 0 007.5 21h9a2.25 2.25 0 002.25-2.25V7.5A2.25 2.25 0 0016.5 5.25H15M9 5.25a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5M9 5.25a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5M9 12h6M9 15.75h3" />
    </svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H15" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

export function IconPause({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14.25 9v6m-4.5-6v6m11.25-3c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
    </svg>
  );
}
