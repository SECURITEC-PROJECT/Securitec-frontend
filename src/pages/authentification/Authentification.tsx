import type { AuthenticatedUser } from "@/lib/auth-api";
import { useState, type FormEvent } from "react";
import FormAuthentification from "./FormAuthentification";
import MarqueAuthentification from "./MarqueAuthentification";

interface AuthentificationProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
}

export default function Authentification({ onLoginSuccess }: AuthentificationProps) {
  // Champs pré-remplis par défaut
  const [identifier, setIdentifier] = useState("admin");
  const [pin, setPin] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simulation d'un utilisateur connecté pour les tests
      const mockUser: AuthenticatedUser = {
        id: 1,
        nom: "Sahala",
        identifiant: identifier || "admin",
        role: "ADMIN",
        siteNom: "Usine Antsirabe",
      };

      // Petite pause pour simuler un temps de réponse réseau
      setTimeout(() => {
        onLoginSuccess(mockUser);
        setLoading(false);
      }, 300);
    } catch (err) {
      setError("Erreur lors de la connexion fictive.");
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