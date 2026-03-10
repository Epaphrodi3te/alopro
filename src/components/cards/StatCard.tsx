import { IconType } from "react-icons";

type StatCardProps = {
  label: string;
  value: number | string;
  icon?: IconType;
  accent?: "indigo" | "emerald" | "amber" | "violet";
};

const accentStyles: Record<NonNullable<StatCardProps["accent"]>, string> = {
  indigo: "from-indigo-50 to-white border-indigo-100 text-indigo-700",
  emerald: "from-emerald-50 to-white border-emerald-100 text-emerald-700",
  amber: "from-amber-50 to-white border-amber-100 text-amber-700",
  violet: "from-violet-50 to-white border-violet-100 text-violet-700",
};

export default function StatCard({ label, value, icon: Icon, accent = "indigo" }: StatCardProps) {
  const accentClass = accentStyles[accent];

  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-[linear-gradient(155deg,#ffffff,#f8fafc_78%)] p-5 shadow-sm ${accentClass}`}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/80 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-slate-500">Mise a jour instantanee</p>
        </div>
        {Icon && (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/70">
            <Icon className="text-base" />
          </span>
        )}
      </div>
    </article>
  );
}
