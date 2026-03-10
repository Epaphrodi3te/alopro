import { IconType } from "react-icons";

type StatCardProps = {
  label: string;
  value: number | string;
  icon?: IconType;
  accent?: "indigo" | "emerald" | "amber" | "violet";
};

const accentStyles: Record<
  NonNullable<StatCardProps["accent"]>,
  {
    shell: string;
    icon: string;
    pulse: string;
  }
> = {
  indigo: {
    shell: "border-indigo-100/90 from-indigo-50/80 to-white",
    icon: "border-indigo-200 bg-indigo-600 text-white",
    pulse: "bg-indigo-100/80",
  },
  emerald: {
    shell: "border-emerald-100/90 from-emerald-50/80 to-white",
    icon: "border-emerald-200 bg-emerald-600 text-white",
    pulse: "bg-emerald-100/80",
  },
  amber: {
    shell: "border-amber-100/90 from-amber-50/80 to-white",
    icon: "border-amber-200 bg-amber-500 text-white",
    pulse: "bg-amber-100/80",
  },
  violet: {
    shell: "border-violet-100/90 from-violet-50/80 to-white",
    icon: "border-violet-200 bg-violet-600 text-white",
    pulse: "bg-violet-100/80",
  },
};

export default function StatCard({ label, value, icon: Icon, accent = "indigo" }: StatCardProps) {
  const accentClass = accentStyles[accent];

  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-[linear-gradient(160deg,#ffffff,#f8fafc_78%)] p-5 shadow-sm ${accentClass.shell}`}>
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl ${accentClass.pulse}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(15,23,42,0.08),rgba(15,23,42,0))]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="text-3xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="text-xs font-medium text-slate-500">Actualisation en temps reel</p>
        </div>

        {Icon ? (
          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${accentClass.icon}`}>
            <Icon className="text-[1.12rem]" />
          </span>
        ) : null}
      </div>
    </article>
  );
}
