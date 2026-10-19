import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Siren } from "lucide-react";
import { useState, type FormEvent } from "react";

interface FormMessageProps {
  onSend: (text: string, alert?: boolean) => void;
}

export default function FormMessage({ onSend }: FormMessageProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent, alert = false) => {
    e.preventDefault();
    onSend(text, alert);
    setText("");
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="mt-3 flex gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message à l'équipe…" />
      <Button type="submit" aria-label="Envoyer"><Send className="h-4 w-4" /></Button>
      <Button type="button" variant="destructive" onClick={(e) => handleSubmit(e, true)}><Siren className="h-4 w-4" /> Alerte</Button>
    </form>
  );
}