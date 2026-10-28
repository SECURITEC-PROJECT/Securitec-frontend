import { AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function confirmDeletion(description: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (confirmed: boolean, id?: string | number) => {
      if (settled) return;
      settled = true;
      if (id !== undefined) toast.dismiss(id);
      resolve(confirmed);
    };

    toast.custom((id) => createPortal(
      <div
        role="alertdialog"
        aria-label="Confirmer la suppression"
        aria-modal="true"
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
        onClick={() => finish(false, id)}
      >
        <div
          className="w-[min(440px,calc(100vw-32px))] rounded-xl border border-amber-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-amber-900 dark:bg-slate-950 dark:text-slate-100"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Confirmer la suppression</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
            <button
              type="button"
              aria-label="Annuler et fermer"
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() => finish(false, id)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={() => finish(false, id)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90"
              onClick={() => finish(true, id)}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>,
      document.body,
    ), {
      duration: Infinity,
      onDismiss: () => finish(false),
    });
  });
}
