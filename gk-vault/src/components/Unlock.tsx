import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useVault } from '../state/VaultContext'

export default function Unlock() {
  const { isExistingVault, unlock, createVault } = useVault()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isSetup = useMemo(() => isExistingVault === false, [isExistingVault])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSetup) {
        if (password.length < 8) {
          setError('Gebruik minimaal 8 tekens.')
          return
        }
        if (password !== confirm) {
          setError('Wachtwoorden komen niet overeen.')
          return
        }
        const ok = await createVault(password)
        if (!ok) setError('Aanmaken is mislukt.')
      } else {
        const ok = await unlock(password)
        if (!ok) setError('Onjuist hoofdwachtwoord.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>{isSetup ? 'Maak je kluis aan' : 'Ontgrendel kluis'}</h2>
      <p style={{ color: '#555' }}>{isSetup ? 'Kies een hoofdwachtwoord om je gegevens lokaal te versleutelen.' : 'Voer je hoofdwachtwoord in om je gegevens te laden.'}</p>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginTop: 12 }}>Hoofdwachtwoord</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ccc' }}
        />
        {isSetup && (
          <>
            <label style={{ display: 'block', marginTop: 12 }}>Bevestig wachtwoord</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </>
        )}
        {error && <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 16, padding: '0.6rem 1rem', borderRadius: 6 }}
        >
          {loading ? 'Bezig…' : isSetup ? 'Aanmaken' : 'Ontgrendelen'}
        </button>
      </form>
    </div>
  )
}