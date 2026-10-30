import { Button } from "@/components/ui/button";
import { serviceApi } from "@/lib/service-api";
import { Bell, Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export default function ClocheNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    try { setItems(await serviceApi.listNotifications() as AppNotification[]); }
    catch { /* Le tableau de bord reste utilisable si les notifications sont indisponibles. */ }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const unread = items.filter((item) => !item.readAt).length;
  const openNotification = async (item: AppNotification) => {
    if (!item.readAt) {
      try {
        await serviceApi.markNotificationRead(item.id);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      } catch { /* La notification restera non lue et pourra être réessayée. */ }
    }
    setOpen(false);
    navigate(item.type === "INCIDENT" ? "/dashboard/anomalie" : "/dashboard");
  };

  return <div className="relative">
    <Button type="button" variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} non lue(s)` : ""}`} title="Notifications" onClick={() => setOpen((value) => !value)}>
      <Bell />
      {unread > 0 && <span className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-destructive-foreground">{unread > 9 ? "9+" : unread}</span>}
    </Button>
    {open && <section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-xl" aria-label="Notifications récentes">
      <div className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2><span className="text-xs text-muted-foreground">{unread} non lue(s)</span></div>
      <div className="max-h-80 divide-y overflow-y-auto">
        {items.slice(0, 20).map((item) => <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`block w-full px-4 py-3 text-left hover:bg-muted/60 ${item.readAt ? "" : "bg-primary/5"}`}>
          <span className="flex items-start gap-2"><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.message}</span><span className="mt-1 block text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString("fr-FR")}</span></span>{item.readAt && <Check className="mt-0.5 size-3 text-success" />}</span>
        </button>)}
        {!items.length && <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune notification.</p>}
      </div>
    </section>}
  </div>;
}
