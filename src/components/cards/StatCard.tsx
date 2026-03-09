import { IconType } from "react-icons";

type StatCardProps = {
  label: string;
  value: number | string;
  icon?: IconType;
  accent?: "blue" | "emerald" | "amber" | "slate";
};

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  blue: "from-blue-600 to-cyan-500",
  emerald: "from-emerald-600 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  slate: "from-slate-700 to-slate-500",
};

export default function StatCard({ label, value, icon: Icon, accent = "slate" }: StatCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentClasses[accent]}`} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        {Icon && (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Icon className="text-base" />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
    </article>
  );
}
