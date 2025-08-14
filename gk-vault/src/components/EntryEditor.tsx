import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { VaultEntryDataSchema } from '../state/VaultContext'
import type { VaultEntryData } from '../state/VaultContext'

export default function EntryEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: VaultEntryData
  onSave: (data: VaultEntryData) => Promise<void>
  onCancel: () => void
}) {
  const [data, setData] = useState<VaultEntryData>(
    initial ?? { title: '', brand: '', model: '', login: '', pin: '', password: '', notes: '' }
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial) setData(initial)
  }, [initial])

  function set<K extends keyof VaultEntryData>(key: K, value: VaultEntryData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      VaultEntryDataSchema.parse(data)
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Ongeldig formulier')
      return
    }
    setSaving(true)
    try {
      await onSave(data)
      onCancel()
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ccc' }

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label>Omschrijving / Apparaat</label>
          <input style={inputStyle} value={data.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Bijv. Vaatwasser XYZ" />
        </div>
        <div>
          <label>Merk</label>
          <input style={inputStyle} value={data.brand ?? ''} onChange={(e) => set('brand', e.target.value)} placeholder="Bijv. Hobart" />
        </div>
        <div>
          <label>Model</label>
          <input style={inputStyle} value={data.model ?? ''} onChange={(e) => set('model', e.target.value)} placeholder="Bijv. PROFI AMX" />
        </div>
        <div>
          <label>Gebruiker / Login</label>
          <input style={inputStyle} value={data.login ?? ''} onChange={(e) => set('login', e.target.value)} placeholder="optioneel" />
        </div>
        <div>
          <label>PIN</label>
          <input style={inputStyle} value={data.pin ?? ''} onChange={(e) => set('pin', e.target.value)} placeholder="optioneel" />
        </div>
        <div>
          <label>Wachtwoord</label>
          <input style={inputStyle} value={data.password ?? ''} onChange={(e) => set('password', e.target.value)} placeholder="optioneel" />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>Notities</label>
        <textarea style={{ ...inputStyle, minHeight: 80 }} value={data.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="optioneel" />
      </div>
      {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', borderRadius: 6 }}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
        <button type="button" onClick={onCancel} style={{ padding: '0.5rem 1rem', borderRadius: 6 }}>Annuleren</button>
      </div>
    </form>
  )
}