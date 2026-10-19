import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText } from "lucide-react";

export interface DocumentItem {
  id: string;
  title: string;
  version: string;
  content: string;
}

interface ListDocumentationProps {
  docs: DocumentItem[];
  read: string[];
  onConsult: (id: string) => void;
}

export default function ListDocumentation({ docs, read, onConsult }: ListDocumentationProps) {
  return (
    <div className="divide-y border-y">
      {docs.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-4 py-5">
          <FileText className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{d.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d.version} · 08 octobre 2026</p>
          </div>
          {read.includes(d.id) && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-4 w-4" /> Lecture confirmée
            </span>
          )}
          <Button variant="outline" onClick={() => onConsult(d.id)}>
            Consulter
          </Button>
        </div>
      ))}
    </div>
  );
}