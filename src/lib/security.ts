import { demo } from "@/lib/demo-store";

export function useProfiles() {
  const map = new Map(demo.list("profiles").map((p) => [p.id, p.full_name]));
  return (id: string | null | undefined) => id ? map.get(id) ?? "Agent" : "—";
}
export function useMe() { return { data: { id: "agent-1", email: "", full_name: "Mickaël Rakoto" } }; }
export function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
export function fmtTime(d: string) { return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
