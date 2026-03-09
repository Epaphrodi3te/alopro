type BadgeVariant = "admin" | "manager" | "agent" | "pending" | "progress" | "done" | "high" | "medium" | "low";

type BadgeProps = {
  label: string;
  variant: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  agent: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  progress: "bg-cyan-100 text-cyan-700",
  done: "bg-emerald-100 text-emerald-700",
  high: "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low: "bg-slate-200 text-slate-700",
};

export default function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${variantStyles[variant]}`}>
      {label}
    </span>
  );
}
