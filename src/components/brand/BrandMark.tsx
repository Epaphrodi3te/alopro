import Image from "next/image";

import aloproLogo from "@/assets/img/alopro-logo.jpeg";

type BrandMarkProps = {
  compact?: boolean;
  dark?: boolean;
  subtitle?: string;
};

export default function BrandMark({
  compact = false,
  dark = false,
  subtitle,
}: BrandMarkProps) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "sm:gap-4"}`}>
      <div
        className={`relative overflow-hidden rounded-2xl border ${
          dark
            ? "border-white/15 bg-white/6"
            : "border-slate-200 bg-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.6)]"
        } ${compact ? "h-12 w-12 p-1.5" : "h-16 w-16 p-2 sm:h-20 sm:w-20"}`}
      >
        <Image
          src={aloproLogo}
          alt="Logo AloPro"
          fill
          sizes={compact ? "48px" : "80px"}
          className="object-cover"
          priority
        />
      </div>

      <div className="min-w-0">
        <p
          className={`truncate font-black uppercase tracking-[0.18em] ${
            dark ? "text-white" : "text-slate-950"
          } ${compact ? "text-sm" : "text-lg sm:text-xl"}`}
        >
          AloPro
        </p>
        {subtitle && (
          <p
            className={`max-w-[26ch] text-xs leading-5 ${
              dark ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
