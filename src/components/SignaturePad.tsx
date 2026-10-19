import { useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function SignaturePad({ label, onSigned }: { label: string; onSigned?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null); const drawing = useRef(false);
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - rect.left) * 600 / rect.width, (e.clientY - rect.top) * 160 / rect.height];
  }
  return <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">{label}</span><Button type="button" variant="ghost" size="icon" title="Effacer la signature" onClick={() => canvas.current?.getContext('2d')?.clearRect(0, 0, 600, 160)}><RotateCcw /></Button></div><canvas ref={canvas} width={600} height={160} aria-label={label} className="h-28 w-full touch-none rounded-md border bg-card" onPointerDown={(e) => { const ctx = e.currentTarget.getContext('2d'); if (!ctx) return; drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const [x = 0, y = 0] = point(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 2; ctx.strokeStyle = getComputedStyle(e.currentTarget).color; }} onPointerMove={(e) => { if (!drawing.current) return; const ctx = e.currentTarget.getContext('2d'); if (!ctx) return; const [x = 0, y = 0] = point(e); ctx.lineTo(x, y); ctx.stroke(); }} onPointerUp={() => { drawing.current = false; onSigned?.(); }} /></div>;
}
