import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export interface RegistryColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

export function isWithinRegistryPeriod(date: string, from: string, to: string) {
  const day = date.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}

export function RegistryPeriodExport<T>({
  from, to, onFromChange, onToChange, records, columns, filename,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  records: T[];
  columns: RegistryColumn<T>[];
  filename: string;
}) {
  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const content = [columns.map((column) => escape(column.label)).join(";"), ...records.map((record) => columns.map((column) => escape(column.value(record))).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="flex flex-wrap items-end gap-2">
    <label className="grid gap-1 text-xs text-muted-foreground">Du<Input type="date" aria-label="Date de début" value={from} max={to || undefined} onChange={(event) => onFromChange(event.target.value)} className="h-9" /></label>
    <label className="grid gap-1 text-xs text-muted-foreground">Au<Input type="date" aria-label="Date de fin" value={to} min={from || undefined} onChange={(event) => onToChange(event.target.value)} className="h-9" /></label>
    <Button type="button" variant="outline" disabled={!records.length} onClick={exportCsv}><Download className="mr-2 size-4" />Exporter CSV ({records.length})</Button>
  </div>;
}
