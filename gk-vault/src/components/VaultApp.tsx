import { useMemo, useRef, useState } from 'react'
import { useVault } from '../state/VaultContext'
import type { DecryptedEntry } from '../state/VaultContext'
import EntryEditor from './EntryEditor'

function EntryRow({ entry, onEdit, onDelete }: { entry: DecryptedEntry; onEdit: (e: DecryptedEntry) => void; onDelete: (id: number) => void }) {
  const [reveal, setReveal] = useState(false)
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{entry.title}</div>
          <div style={{ color: '#666', fontSize: 13 }}>
            {[entry.brand, entry.model].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setReveal((r) => !r)}>{reveal ? 'Verberg' : 'Toon'}</button>
          <button onClick={() => onEdit(entry)}>Bewerken</button>
          <button onClick={() => onDelete(entry.id)} style={{ color: 'crimson' }}>Verwijder</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, color: '#333' }}>
        {entry.login && <div><strong>Login:</strong> {entry.login}</div>}
        {entry.pin && <div><strong>PIN:</strong> {reveal ? entry.pin : '••••••'}</div>}
        {entry.password && <div><strong>Wachtwoord:</strong> {reveal ? entry.password : '••••••'}</div>}
      </div>
      {entry.notes && <div style={{ marginTop: 8, color: '#444' }}>{entry.notes}</div>}
      <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>Laatste wijziging: {new Date(entry.updatedAt).toLocaleString()}</div>
    </div>
  )
}

export default function VaultApp() {
  const { entries, add, update, remove, lock, searchTerm, setSearchTerm, exportJson, importJson } = useVault()
  const [editing, setEditing] = useState<DecryptedEntry | null>(null)
  const [adding, setAdding] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => [e.title, e.brand, e.model, e.login, e.pin, e.password, e.notes]
      .filter(Boolean)
      .some((v) => (v ?? '').toLowerCase().includes(q)))
  }, [entries, searchTerm])

  async function handleExport() {
    const json = await exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gk-vault-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    await importJson(text)
    alert('Import voltooid. Ontgrendel opnieuw met het wachtwoord dat bij deze export hoort.')
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0 }}>GK Vault</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setAdding(true)}>Nieuw item</button>
          <button onClick={handleExport}>Exporteer</button>
          <button onClick={() => fileRef.current?.click()}>Importeer</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImportFile(f)
          }} />
          <button onClick={lock}>Vergrendel</button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <input placeholder="Zoeken…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ccc' }} />
      </div>

      {adding && (
        <EntryEditor
          onSave={async (data) => add(data)}
          onCancel={() => setAdding(false)}
        />
      )}

      {editing && (
        <EntryEditor
          initial={{ title: editing.title, brand: editing.brand, model: editing.model, login: editing.login, pin: editing.pin, password: editing.password, notes: editing.notes }}
          onSave={async (data) => update(editing.id, data)}
          onCancel={() => setEditing(null)}
        />
      )}

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {filtered.map((e) => (
          <EntryRow key={e.id} entry={e} onEdit={setEditing} onDelete={remove} />
        ))}
        {filtered.length === 0 && <div style={{ color: '#666', marginTop: 24 }}>Geen resultaten.</div>}
      </div>
    </div>
  )
}