import { useState, type FormEvent } from "react";
import FormAuthentification from "./FormAuthentification";
import MarqueAuthentification from "./MarqueAuthentification";

interface AuthentificationProps {
  onLoginSuccess?: (user: { nom: string; pin: string }) => void;
}

export default function Authentification({ onLoginSuccess }: AuthentificationProps) {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const essaie = [
      { nom: "kbenali", pin: "123456" },
      { nom: "dupont", pin: "123456" }
    ];

    const utilisateurTrouve = essaie.find(
      (user) => user.nom.toLowerCase() === identifier.trim().toLowerCase() && user.pin === pin
    );

    if (utilisateurTrouve) {
      if (onLoginSuccess) {
        onLoginSuccess(utilisateurTrouve);
      }
    } else {
      setError("Nom ou PIN incorrect");
    }
  };

  return (
    <main className="auth-layout">
      <MarqueAuthentification />
      <FormAuthentification 
        identifier={identifier}
        setIdentifier={setIdentifier}
        pin={pin}
        setPin={setPin}
        error={error}
        setError={setError}
        onSubmit={handleSubmit}
      />
    </main>
  );
}