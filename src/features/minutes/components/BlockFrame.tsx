import { useEffect, useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { GRID } from '../types'
import type { Block } from '../types'
import styles from './Blocks.module.css'

interface BlockFrameProps {
  block: Block
  pageWidth: number
  selected: boolean
  editing: boolean
  /** Hauteur redimensionnable à la main (texte) ; un tableau a la hauteur de ses lignes. */
  resizableHeight: boolean
  onSelect: () => void
  onChange: (patch: Partial<Block>) => void
  onMeasure: (id: string, height: number) => void
  children: ReactNode
}

const snap = (value: number) => Math.round(value / GRID) * GRID

/**
 * Cadre d'un bloc posé sur la page : il se déplace en glissant sa barre du haut et se redimensionne par la poignée du coin.
 * Hors mode conception, il ne reste que le contenu, positionné au même endroit.
 */
export function BlockFrame({ block, pageWidth, selected, editing, resizableHeight, onSelect, onChange, onMeasure, children }: BlockFrameProps) {
  const ref = useRef<HTMLDivElement>(null)

  // La page s'agrandit avec ses blocs : on remonte la hauteur réelle (un tableau grandit avec ses lignes).
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(() => onMeasure(block.id, element.offsetHeight))
    observer.observe(element)
    return () => observer.disconnect()
  }, [block.id, onMeasure])

  function startDrag(event: PointerEvent<HTMLElement>, mode: 'move' | 'resize') {
    if (!editing) return
    event.preventDefault()
    event.stopPropagation()
    onSelect()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const start = { px: event.clientX, py: event.clientY, x: block.x, y: block.y, w: block.w, h: 'h' in block ? block.h : 0 }

    const move = (moveEvent: globalThis.PointerEvent) => {
      const dx = moveEvent.clientX - start.px
      const dy = moveEvent.clientY - start.py
      if (mode === 'move') {
        onChange({ x: Math.max(0, Math.min(snap(start.x + dx), pageWidth - block.w)), y: Math.max(0, snap(start.y + dy)) })
      } else {
        const w = Math.max(80, Math.min(snap(start.w + dx), pageWidth - block.x))
        onChange(resizableHeight ? { w, h: Math.max(32, snap(start.h + dy)) } : { w })
      }
    }
    const end = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }

  return (
    <div
      ref={ref}
      className={`${styles.frame} ${editing ? styles.editing : ''} ${selected && editing ? styles.selected : ''}`}
      style={{ left: block.x, top: block.y, width: block.w, ...('h' in block && { height: block.h }) }}
      onPointerDown={(event) => {
        if (!editing) return
        // Sans cela, le clic remonterait à la page, qui désélectionne.
        event.stopPropagation()
        onSelect()
      }}
    >
      {editing && (
        <div className={styles.grip} onPointerDown={(event) => startDrag(event, 'move')} title="Glisser pour déplacer">
          <span aria-hidden>⠿ {{ text: 'Texte', table: 'Tableau', image: 'Photo' }[block.type]}</span>
        </div>
      )}
      {children}
      {editing && <div className={styles.resize} onPointerDown={(event) => startDrag(event, 'resize')} title="Glisser pour redimensionner" />}
    </div>
  )
}
