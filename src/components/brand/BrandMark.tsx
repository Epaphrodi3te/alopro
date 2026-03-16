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
    <div className={`flex items-center gap-2.5 ${compact ? "" : "sm:gap-3"}`}>
      <div
        className={`relative overflow-hidden rounded-xl border ${
          dark
            ? "border-white/15 bg-white/5"
            : "border-slate-200 bg-white shadow-sm"
        } ${compact ? "h-10 w-10 p-1" : "h-12 w-12 p-1.5 sm:h-14 sm:w-14 sm:p-2"}`}
      >
        <Image
          src={aloproLogo}
          alt="Logo AloPro"
          fill
          sizes={compact ? "40px" : "56px"}
          className="object-cover"
          priority
        />
      </div>

      <div className="min-w-0">
        <p
          className={`truncate font-bold uppercase tracking-[0.12em] ${
            dark ? "text-white" : "text-slate-900"
          } ${compact ? "text-sm" : "text-base sm:text-lg"}`}
        >
          AloPro
        </p>
        {subtitle && (
          <p
            className={`max-w-[26ch] text-xs leading-relaxed ${
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
