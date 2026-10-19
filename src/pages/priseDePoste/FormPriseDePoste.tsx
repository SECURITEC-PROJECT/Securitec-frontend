
import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const CHECKS = [
  "Tenue réglementaire",
  "Radio / talkie-walkie testé",
  "Clés du site récupérées",
  "Lampe torche",
  "Téléphone de service chargé",
  "Registre consulté",
  "Vidéosurveillance opérationnelle",
  "Système d'alarme vérifié",
];

interface FormPriseDePosteProps {
  mine: {
    post_name: string;
    started_at: string;
  } | null | undefined;
  onStart: (
    post: string,
    checks: Record<string, boolean>,
    notes: string
  ) => void;
  onEnd: () => void;
  fmt: (dateStr: string | null) => string;
}

export default function FormPriseDePoste({
  mine,
  onStart,
  onEnd,
  fmt,
}: FormPriseDePosteProps) {
  const [post, setPost] = useState("Poste principal");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  const handleCheck = (name: string, checked: boolean) => {
    setChecks((previous) => ({
      ...previous,
      [name]: checked,
    }));
  };

  const handleStart = () => {
    if (!post.trim()) {
      return;
    }

    onStart(post.trim(), checks, notes.trim());
    setChecks({});
    setNotes("");
  };

  if (mine) {
    return (
      <Panel title="Service en cours">
        <p className="text-lg font-semibold">{mine.post_name}</p>

        <p className="text-sm text-muted-foreground">
          Débuté à {fmt(mine.started_at)}
        </p>

        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          onClick={onEnd}
        >
          Terminer le service
        </Button>
      </Panel>
    );
  }

  return (
    <Panel title="Nouvelle prise de poste">
      <div className="space-y-4">
        <div>
          <Label htmlFor="post-name">Poste</Label>
          <Input
            id="post-name"
            value={post}
            onChange={(e) => setPost(e.target.value)}
            className="mt-1"
            placeholder="Nom du poste"
          />
        </div>

        <div>
          <Label className="mb-2 block">
            Vérification des équipements et consignes
          </Label>

          <div className="space-y-2">
            {CHECKS.map((check) => (
              <label
                key={check}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={!!checks[check]}
                  onCheckedChange={(value) =>
                    handleCheck(check, value === true)
                  }
                />

                <span>{check}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="shift-notes">Observations</Label>
          <Textarea
            id="shift-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Matériel manquant, anomalie constatée…"
            className="mt-1"
          />
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={!post.trim()}
          onClick={handleStart}
        >
          Valider la prise de poste
        </Button>
      </div>
    </Panel>
  );
}
