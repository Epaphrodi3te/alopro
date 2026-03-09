type StatCardProps = {
  label: string;
  value: number | string;
  accent?: "blue" | "emerald" | "amber" | "slate";
};

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  blue: "from-blue-600 to-cyan-500",
  emerald: "from-emerald-600 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  slate: "from-slate-700 to-slate-500",
};

export default function StatCard({ label, value, accent = "slate" }: StatCardProps) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClasses[accent]}`} />
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
