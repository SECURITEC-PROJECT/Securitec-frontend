import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePrintTitle } from '../../../components/layout/PrintHeader'
import { useCurrentSite } from '../../../components/layout/SiteLayout/useCurrentSite'
import { Icon } from '../../../components/ui'
import type { IconName } from '../../../components/ui'
import { usePermissions } from '../../auth'
import { fetchSiteSheets, fetchSheetRows } from '../../sheets/services/sheets'
import type { Sheet, SheetRow } from '../../sheets/types'
import { BlockFrame } from '../components/BlockFrame'
import { BlockPanel } from '../components/BlockPanel'
import { TableBlockView } from '../components/TableBlockView'
import { ImageBlockView } from '../components/ImageBlockView'
import { TextBlockView } from '../components/TextBlockView'
import { fetchMinutes, saveMinutes } from '../services/minutes'
import { readPhoto } from '../photo'
import { PAGE_MIN_HEIGHT, PAGE_WIDTH, newImageBlock, newTableBlock, newTextBlock, readLayout } from '../types'
import type { Block, ImageBlock, MinutesLayout, Orientation } from '../types'
import styles from './MinutesEditorPage.module.css'

function IconButton({ icon, label, onClick, primary, rotated }: { icon: IconName; label: string; onClick: () => void; primary?: boolean; rotated?: boolean }) {
  return (
    <button type="button" className={`${styles.iconButton} ${primary ? styles.iconPrimary : ''} ${rotated ? styles.rotated : ''}`} title={label} aria-label={label} onClick={onClick}>
      <Icon name={icon} size={20} />
    </button>
  )
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

const SAVE_LABEL: Record<SaveState, string> = { saved: 'Enregistré', dirty: 'Modifications non enregistrées…', saving: 'Enregistrement…', error: 'Échec de l’enregistrement' }

/**
 * Conception d'un compte rendu : une page sur laquelle on place librement des blocs de texte et des tableaux tirés des feuilles de saisie.
 * Chaque bloc se déplace et se redimensionne à la souris ; l'enregistrement est automatique.
 */
export function MinutesEditorPage() {
  const { minutesId = '' } = useParams()
  const site = useCurrentSite()
  const { can } = usePermissions()
  const canEdit = can('minutes.update')

  const [name, setName] = useState('')
  const [layout, setLayout] = useState<MinutesLayout>()
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [selectedId, setSelectedId] = useState<string>()
  const [designing, setDesigning] = useState(canEdit)
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [rowsBySheet, setRowsBySheet] = useState<Record<string, SheetRow[]>>({})
  const [heights, setHeights] = useState<Record<string, number>>({})
  const requested = useRef(new Set<string>())
  const photoInput = useRef<HTMLInputElement>(null)
  /** Bloc photo qui attend le fichier choisi ; absent = on crée un nouveau bloc. */
  const photoTarget = useRef<string | undefined>(undefined)

  usePrintTitle(name || undefined)

  useEffect(() => {
    let cancelled = false
    fetchMinutes(minutesId)
      .then((loaded) => {
        if (cancelled) return
        setName(loaded.name)
        setLayout(readLayout(loaded.layout))
      })
      .catch((failure: Error) => !cancelled && setLoadError(failure.message))
    fetchSiteSheets(site.id)
      .then((loaded) => !cancelled && setSheets(loaded))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [minutesId, site.id])

  // Les lignes d'une feuille ne sont chargées qu'une fois, quel que soit le nombre de tableaux qui l'utilisent.
  useEffect(() => {
    for (const block of layout?.blocks ?? []) {
      if (block.type !== 'table' || !block.sheetId || requested.current.has(block.sheetId)) continue
      const sheetId = block.sheetId
      requested.current.add(sheetId)
      fetchSheetRows(sheetId)
        .then((rows) => setRowsBySheet((current) => ({ ...current, [sheetId]: rows })))
        .catch((failure: Error) => {
          requested.current.delete(sheetId)
          setError(`Lignes de la feuille indisponibles : ${failure.message}`)
        })
    }
  }, [layout])

  // Enregistrement automatique, peu après la dernière modification.
  const latest = useRef({ name, layout })
  useEffect(() => {
    latest.current = { name, layout }
  }, [name, layout])

  const persist = useCallback(async () => {
    const { name: currentName, layout: currentLayout } = latest.current
    if (!currentLayout) return
    setSaveState('saving')
    try {
      await saveMinutes(minutesId, currentName, currentLayout)
      setSaveState((state) => (state === 'saving' ? 'saved' : state))
      setError('')
    } catch (failure) {
      setSaveState('error')
      setError((failure as Error).message)
    }
  }, [minutesId])

  useEffect(() => {
    if (saveState !== 'dirty') return
    const timer = setTimeout(persist, 1500)
    return () => clearTimeout(timer)
  }, [saveState, layout, name, persist])

  const touch = () => setSaveState('dirty')
  const update = (change: (current: MinutesLayout) => MinutesLayout) => {
    setLayout((current) => current && change(current))
    touch()
  }
  const patchBlock = (id: string, patch: Partial<Block>) => update((current) => ({ ...current, blocks: current.blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as Block) : block)) }))

  const measure = useCallback((id: string, height: number) => setHeights((current) => (current[id] === height ? current : { ...current, [id]: height })), [])

  if (loadError) return <p className={styles.status}>{loadError}</p>
  if (!layout) return <p className={styles.status}>Chargement...</p>

  const orientation = layout.page.orientation
  const pageWidth = PAGE_WIDTH[orientation]
  const bottom = layout.blocks.reduce((max, block) => Math.max(max, block.y + (heights[block.id] ?? ('h' in block ? block.h : 120))), 0)
  const pageHeight = Math.max(PAGE_MIN_HEIGHT[orientation], bottom + 32)
  const nextY = layout.blocks.length ? Math.ceil((bottom + 16) / 4) * 4 : 0
  const selected = designing ? layout.blocks.find((block) => block.id === selectedId) : undefined

  function addBlock(block: Block) {
    update((current) => ({ ...current, blocks: [...current.blocks, block] }))
    setSelectedId(block.id)
  }

  function pickPhoto(blockId?: string) {
    photoTarget.current = blockId
    photoInput.current?.click()
  }

  async function photoChosen(file: File | undefined) {
    if (!file) return
    try {
      const photo = await readPhoto(file)
      const target = photoTarget.current
      const ratio = photo.height / photo.width
      if (target) {
        const width = layout?.blocks.find((block) => block.id === target)?.w ?? 240
        patchBlock(target, { src: photo.src, h: Math.max(32, Math.round((width * ratio) / 4) * 4) } as Partial<ImageBlock>)
      } else {
        const block = newImageBlock(0, nextY)
        addBlock({ ...block, src: photo.src, h: Math.round((block.w * ratio) / 4) * 4 })
      }
      setError('')
    } catch (failure) {
      setError((failure as Error).message)
    }
  }

  function setOrientation(next: Orientation) {
    // Les blocs trop larges pour la nouvelle page sont ramenés dans ses limites.
    update((current) => ({
      page: { orientation: next },
      blocks: current.blocks.map((block) => {
        const w = Math.min(block.w, PAGE_WIDTH[next])
        return { ...block, w, x: Math.min(block.x, PAGE_WIDTH[next] - w) }
      }),
    }))
  }

  function reorder(id: string, direction: 'front' | 'back') {
    update((current) => {
      const block = current.blocks.find((candidate) => candidate.id === id)
      if (!block) return current
      const others = current.blocks.filter((candidate) => candidate.id !== id)
      return { ...current, blocks: direction === 'front' ? [...others, block] : [block, ...others] }
    })
  }

  return (
    <div className={styles.page}>
      <style>{`@media print { @page { size: A4 ${orientation}; margin: 12mm 10mm 14mm; } }`}</style>
      <div className={styles.toolbar} data-print="hide">
        <Link to={`/sites/${site.id}/comptes-rendus`} className={styles.back} title="Retour aux comptes rendus">
          <Icon name="prev" size={20} />
        </Link>
        <input
          className={styles.name}
          value={name}
          readOnly={!canEdit}
          maxLength={160}
          onChange={(event) => {
            setName(event.target.value)
            touch()
          }}
          aria-label="Nom du compte rendu"
        />
        <span className={`${styles.saveState} ${saveState === 'error' ? styles.saveError : saveState === 'saved' ? '' : styles.saveDirty}`}>{SAVE_LABEL[saveState]}</span>
        <div className={styles.tools}>
          {canEdit && designing && (
            <>
              <IconButton icon="text" label="Ajouter un texte" onClick={() => addBlock(newTextBlock(0, nextY))} />
              <IconButton icon="camera" label="Ajouter une photo" onClick={() => pickPhoto()} />
              <IconButton icon="table" label="Ajouter un tableau" onClick={() => addBlock(newTableBlock(0, nextY, pageWidth))} />
              <IconButton
                icon="page"
                label={orientation === 'portrait' ? 'Passer la page en paysage' : 'Passer la page en portrait'}
                rotated={orientation === 'landscape'}
                onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
              />
              <span className={styles.separator} />
            </>
          )}
          {canEdit && (
            <IconButton
              icon={designing ? 'eye' : 'edit'}
              label={designing ? 'Aperçu' : 'Modifier la mise en page'}
              onClick={() => {
                setDesigning((current) => !current)
                setSelectedId(undefined)
              }}
            />
          )}
          {canEdit && saveState !== 'saved' && saveState !== 'saving' && <IconButton icon="save" label="Enregistrer" onClick={persist} />}
          <IconButton icon="print" label="Imprimer" primary onClick={() => window.print()} />
        </div>
      </div>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void photoChosen(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {error && (
        <p className={styles.error} data-print="hide">
          {error}
        </p>
      )}

      <div className={styles.workspace} data-print-flow>
        <div className={styles.scroller} data-print-flow onPointerDown={() => setSelectedId(undefined)}>
          <div className={`${styles.paper} ${designing ? styles.designing : ''}`} style={{ width: pageWidth, height: pageHeight }}>
            {layout.blocks.length === 0 && (
              <p className={styles.empty} data-print="hide">
                Page vide : ajoutez un bloc de texte, une photo ou un tableau avec les boutons de la barre du haut.
              </p>
            )}
            {layout.blocks.map((block) => (
              <BlockFrame
                key={block.id}
                block={block}
                pageWidth={pageWidth}
                selected={block.id === selectedId}
                editing={designing}
                resizableHeight={block.type !== 'table'}
                onSelect={() => setSelectedId(block.id)}
                onChange={(patch) => patchBlock(block.id, patch)}
                onMeasure={measure}
              >
                {block.type === 'text' && <TextBlockView block={block} editing={designing} onChange={(patch) => patchBlock(block.id, patch)} />}
                {block.type === 'image' && <ImageBlockView block={block} editing={designing} onPick={() => pickPhoto(block.id)} />}
                {block.type === 'table' && (
                  <TableBlockView
                    block={block}
                    sheet={sheets.find((candidate) => candidate.id === block.sheetId)}
                    rows={block.sheetId ? rowsBySheet[block.sheetId] : undefined}
                    editing={designing}
                    onChange={(patch) => patchBlock(block.id, patch)}
                  />
                )}
              </BlockFrame>
            ))}
          </div>
        </div>
        {selected && (
          <BlockPanel
            block={selected}
            sheets={sheets}
            onChange={(patch) => patchBlock(selected.id, patch)}
            onOrder={(direction) => reorder(selected.id, direction)}
            onPickPhoto={() => pickPhoto(selected.id)}
            onDelete={() => {
              update((current) => ({ ...current, blocks: current.blocks.filter((block) => block.id !== selected.id) }))
              setSelectedId(undefined)
            }}
          />
        )}
      </div>
    </div>
  )
}
