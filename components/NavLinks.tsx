"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconClipboard, IconChat } from "@/components/icons";

const links = [
  { href: "/", label: "Visão geral", Icon: IconHome },
  { href: "/solicitacoes", label: "Solicitações", Icon: IconClipboard },
  { href: "/conversas", label: "Conversas", Icon: IconChat },
];

export default function NavLinks({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      className={
        isHorizontal
          ? "flex items-center gap-1 overflow-x-auto"
          : "flex flex-col gap-1"
      }
    >
      {links.map(({ href, label, Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isHorizontal ? "whitespace-nowrap" : ""
            } ${
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 ${
                isActive ? "text-brand-600" : "text-slate-400"
              }`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
