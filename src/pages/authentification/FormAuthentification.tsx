
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Delete,
  LockKeyhole,
  Radio,
} from "lucide-react";
import type { FormEvent } from "react";

interface FormAuthentificationProps {
  identifier: string;
  setIdentifier: (val: string) => void;
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  error: string;
  setError: (val: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}

export default function FormAuthentification({
  identifier,
  setIdentifier,
  pin,
  setPin,
  error,
  setError,
  onSubmit,
  loading,
}: FormAuthentificationProps) {
  return (
    <section className="auth-form-area">
      <div className="auth-form-inner">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            POSTE PRINCIPAL
          </span>

          <span className="flex items-center gap-1.5 rounded border border-success/25 bg-success/10 px-2 py-1 text-[10px] font-medium text-success">
            <Radio className="h-3 w-3" />
            Session sécurisée
          </span>
        </div>

        <h1 className="text-2xl font-semibold">Connexion</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Identifiez-vous pour accéder au poste.
        </p>

        <form onSubmit={onSubmit} className="mt-6">
          <label htmlFor="identifier" className="text-sm font-medium">
            Identifiant
          </label>

          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
            placeholder="Votre identifiant"
            className="mt-2 h-11"
            autoComplete="username"
            required
          />

          <label
            htmlFor="pin"
            className="mt-5 block text-sm font-medium"
          >
            Code PIN (6 chiffres)
          </label>

          <div className="relative my-3 flex h-8 items-center justify-center gap-3">
            <Input
              id="pin"
              aria-label="Code PIN (6 chiffres)"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              className="absolute inset-0 h-full w-full opacity-0"
            />

            <div
              className="pointer-events-none flex gap-3"
              aria-hidden="true"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full border-2 ${
                    i < pin.length
                      ? "border-login-ink bg-login-ink"
                      : "border-input"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
              (n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  className="h-12 bg-card text-lg font-semibold"
                  onClick={() => {
                    setPin((p) => (p + n).slice(0, 6));
                    setError("");
                  }}
                >
                  {n}
                </Button>
              )
            )}

            <span />

            <Button
              type="button"
              variant="outline"
              className="h-12 bg-card text-lg font-semibold"
              onClick={() => {
                setPin((p) => (p + "0").slice(0, 6));
                setError("");
              }}
            >
              0
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 bg-card"
              aria-label="Effacer le dernier chiffre"
              title="Effacer le dernier chiffre"
              onClick={() => {
                setPin((p) => p.slice(0, -1));
                setError("");
              }}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-8 pt-2" aria-live="polite">
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !identifier.trim() || pin.length !== 6}
            className="h-12 w-full bg-login-accent text-login-ink hover:bg-login-accent/85"
          >
            <LockKeyhole className="h-4 w-4" />
            {loading ? "Connexion…" : "Accéder au poste"}
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">Connexion vérifiée par le serveur Securitec</p>

      </div>
    </section>
  );
}

