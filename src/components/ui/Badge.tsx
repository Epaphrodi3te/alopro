type BadgeVariant = "admin" | "manager" | "agent" | "pending" | "progress" | "done" | "high" | "medium" | "low";

type BadgeProps = {
  label: string;
  variant: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  admin: "bg-slate-900 text-white",
  manager: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  agent: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  progress: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  high: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  low: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
};

export default function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${variantStyles[variant]}`}>
      {label}
    </span>
  );
}
