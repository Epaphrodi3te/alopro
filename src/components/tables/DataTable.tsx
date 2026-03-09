import { ReactNode } from "react";

type DataTableProps = {
  columns: string[];
  children: ReactNode;
  emptyLabel: string;
  hasRows: boolean;
};

export default function DataTable({ columns, children, emptyLabel, hasRows }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="responsive-table min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3.5 font-semibold whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:nth-child(2n)]:bg-slate-50/45">
            {hasRows ? (
              children
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
