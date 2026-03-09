type BadgeVariant = "admin" | "manager" | "agent" | "pending" | "progress" | "done" | "high" | "medium" | "low";

type BadgeProps = {
  label: string;
  variant: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  admin: "bg-red-100 text-red-700 ring-1 ring-red-200",
  manager: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  agent: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  progress: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",
  done: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  high: "bg-red-100 text-red-700 ring-1 ring-red-200",
  medium: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  low: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
};

export default function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${variantStyles[variant]}`}>
      {label}
    </span>
  );
}
