type BadgeVariant = "admin" | "manager" | "agent" | "pending" | "progress" | "done" | "high" | "medium" | "low";

type BadgeProps = {
  label: string;
  variant: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  admin: "bg-slate-100 text-slate-700 ring-1 ring-slate-300",
  manager: "bg-sky-50 text-slate-700 ring-1 ring-sky-200",
  agent: "bg-teal-50 text-slate-700 ring-1 ring-teal-200",
  pending: "bg-slate-100 text-slate-700 ring-1 ring-slate-300",
  progress: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  high: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  low: "bg-slate-100 text-slate-700 ring-1 ring-slate-300",
};

export default function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${variantStyles[variant]}`}>
      {label}
    </span>
  );
}
