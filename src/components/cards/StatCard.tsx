import { IconType } from "react-icons";

type StatCardProps = {
  label: string;
  value: number | string;
  icon?: IconType;
  accent?: "indigo" | "emerald" | "amber" | "violet";
};

const accentStyles: Record<
  NonNullable<StatCardProps["accent"]>,
  { icon: string; border: string }
> = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600",
    border: "border-indigo-100",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-100",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    border: "border-amber-100",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    border: "border-violet-100",
  },
};

export default function StatCard({ label, value, icon: Icon, accent = "indigo" }: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        {Icon && (
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${styles.icon}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
    </article>
  );
}
