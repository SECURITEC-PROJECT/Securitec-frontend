import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/security";
import { useEffect, useRef } from "react";

interface ListMessageProps {
  data: any[];
  me: { id: string };
  name: (id: string) => string;
  onAcknowledge: (id: string) => void;
}

export default function ListMessage({ data, me, name, onAcknowledge }: ListMessageProps) {
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    const el = bottom.current?.parentElement; 
    if (el) el.scrollTop = el.scrollHeight; 
  }, [data.length]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border bg-card p-4">
      {data.map((m) => {
        const mine = m.sender_id === me?.id;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.is_alert ? "bg-destructive text-destructive-foreground" : mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p className="text-xs opacity-75">{mine ? "Vous" : name(m.sender_id)} · {fmt(m.created_at)}</p>
              <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
              {m.sender_id === "supervisor" && (
                <Button size="sm" variant="secondary" className="mt-2" disabled={m.acknowledged} onClick={() => onAcknowledge(m.id)}>
                  {m.acknowledged ? "Lecture confirmée" : "Accuser réception"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottom} />
    </div>
  );
}