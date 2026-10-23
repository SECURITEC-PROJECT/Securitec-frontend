import { API_URL, authHeaders } from "@/lib/api";
import { useEffect, useState } from "react";

// Visiteur ou véhicule encore présent après la fermeture du site
export interface Anomalie {
  id: string;
  type: "visiteur" | "vehicule";
  rowId: string; // identifiant de la ligne dans « Présents sur site » et le registre
  titre: string;
  message: string;
  site: string;
  zone: string;
  dateEntree: string;
  heureEntree: string;
  heureFermeture: string;
  retardMinutes: number;
  retardTexte: string;
  lignes: { label: string; valeur: string }[];
}

const INTERVALLE_MS = 60_000; // vérification chaque minute

// Une seule liste partagée par toute l'application (cloche, présents, registres)
let cache: Anomalie[] = [];
const abonnes = new Set<(liste: Anomalie[]) => void>();
let minuteur: ReturnType<typeof setInterval> | null = null;

async function charger() {
  try {
    const res = await fetch(`${API_URL}/anomalies/sorties`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    cache = Array.isArray(data.anomalies) ? data.anomalies : [];
    abonnes.forEach((notifier) => notifier(cache));
  } catch {
    // On garde la dernière liste connue si le serveur est injoignable
  }
}

// À appeler après une sortie pour retirer tout de suite l'alerte
export function rafraichirAnomalies() {
  void charger();
}

export function useAnomalies(): Anomalie[] {
  const [anomalies, setAnomalies] = useState<Anomalie[]>(cache);

  useEffect(() => {
    abonnes.add(setAnomalies);
    if (abonnes.size === 1) {
      void charger();
      minuteur = setInterval(charger, INTERVALLE_MS);
    } else {
      setAnomalies(cache);
    }
    return () => {
      abonnes.delete(setAnomalies);
      if (abonnes.size === 0 && minuteur) {
        clearInterval(minuteur);
        minuteur = null;
      }
    };
  }, []);

  return anomalies;
}