import { API_URL, authHeaders } from "@/lib/api";
import { useEffect, useState } from "react";

// Visiteur ou véhicule encore présent après la fermeture du site
export interface Anomalie {
  id: string;
  type: "visiteur" | "vehicule";
  rowId: string;
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

const INTERVALLE_MS = 60_000;

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
    // Conserve la dernière liste connue si le serveur est momentanément injoignable.
  }
}

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
