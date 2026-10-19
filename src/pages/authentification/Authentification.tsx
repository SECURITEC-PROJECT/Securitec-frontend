import { useState, type FormEvent } from "react";
import FormAuthentification from "./FormAuthentification";
import MarqueAuthentification from "./MarqueAuthentification";
import { login, type AuthenticatedUser } from "@/lib/auth-api";

interface AuthentificationProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
}

export default function Authentification({ onLoginSuccess }: AuthentificationProps) {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(identifier, pin);
      onLoginSuccess(user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible.");
    } finally {
      setLoading(false);
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
        loading={loading}
      />
    </main>
  );
}
