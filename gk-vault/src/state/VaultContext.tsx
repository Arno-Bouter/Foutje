import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { addEntry as dbAddEntry, deleteEntry as dbDeleteEntry, getAllData, getMeta, listEntries as dbListEntries, replaceAll, saveMeta, updateEntry as dbUpdateEntry } from '../lib/db'
import { createKeyCheck, decryptObject, deriveAesGcmKey, encryptObject, generateSalt } from '../lib/crypto'

export const VaultEntryDataSchema = z.object({
  title: z.string().min(1, 'Titel is verplicht'),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  login: z.string().optional().nullable(),
  pin: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type VaultEntryData = z.infer<typeof VaultEntryDataSchema>

export type DecryptedEntry = VaultEntryData & {
  id: number
  createdAt: string
  updatedAt: string
}

type VaultContextValue = {
  isExistingVault: boolean | null
  isUnlocked: boolean
  unlock: (password: string) => Promise<boolean>
  createVault: (password: string) => Promise<boolean>
  lock: () => void
  entries: DecryptedEntry[]
  add: (data: VaultEntryData) => Promise<void>
  update: (id: number, data: VaultEntryData) => Promise<void>
  remove: (id: number) => Promise<void>
  searchTerm: string
  setSearchTerm: (s: string) => void
  exportJson: () => Promise<string>
  importJson: (json: string) => Promise<void>
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined)

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [isExistingVault, setIsExistingVault] = useState<boolean | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [key, setKey] = useState<CryptoKey | null>(null)
  const [entries, setEntries] = useState<DecryptedEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    ;(async () => {
      const meta = await getMeta()
      setIsExistingVault(!!meta)
    })()
  }, [])

  const loadEntries = useCallback(async (derivedKey: CryptoKey) => {
    const records = await dbListEntries()
    const decrypted: DecryptedEntry[] = []
    for (const r of records) {
      const data = await decryptObject<VaultEntryData>(derivedKey, r.iv, r.ciphertext)
      decrypted.push({
        id: r.id!,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        ...data,
      })
    }
    decrypted.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    setEntries(decrypted)
  }, [])

  const unlock = useCallback(async (password: string) => {
    const meta = await getMeta()
    if (!meta) return false
    const salt = new Uint8Array(meta.salt)
    const derivedKey = await deriveAesGcmKey(password, salt)
    // verify key
    try {
      const ok = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(meta.keyCheck.iv) },
        derivedKey,
        meta.keyCheck.ciphertext
      )
      const dec = new TextDecoder()
      const text = dec.decode(ok)
      if (text !== 'gk-vault-keycheck') return false
    } catch {
      return false
    }
    setKey(derivedKey)
    setIsUnlocked(true)
    await loadEntries(derivedKey)
    return true
  }, [loadEntries])

  const createVault = useCallback(async (password: string) => {
    const existing = await getMeta()
    if (existing) {
      // Vault already exists, just try to unlock
      return unlock(password)
    }
    const salt = await generateSalt(16)
    const derivedKey = await deriveAesGcmKey(password, salt)
    const keyCheck = await createKeyCheck(derivedKey)
    await saveMeta({ id: 'meta', salt: salt.buffer, keyCheck })
    setKey(derivedKey)
    setIsUnlocked(true)
    setIsExistingVault(true)
    await loadEntries(derivedKey)
    return true
  }, [loadEntries, unlock])

  const lock = useCallback(() => {
    setIsUnlocked(false)
    setKey(null)
    setEntries([])
  }, [])

  const add = useCallback(async (data: VaultEntryData) => {
    if (!key) throw new Error('Not unlocked')
    const parsed = VaultEntryDataSchema.parse(data)
    const now = new Date().toISOString()
    const enc = await encryptObject(key, parsed)
    const id = await dbAddEntry({
      ...enc,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    setEntries((prev) => [{ id, createdAt: now, updatedAt: now, ...parsed }, ...prev])
  }, [key])

  const update = useCallback(async (id: number, data: VaultEntryData) => {
    if (!key) throw new Error('Not unlocked')
    const parsed = VaultEntryDataSchema.parse(data)
    const now = new Date().toISOString()
    const enc = await encryptObject(key, parsed)
    await dbUpdateEntry(id, { ...enc, createdAt: entries.find(e => e.id === id)?.createdAt ?? now, updatedAt: now, version: 1 })
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...parsed, updatedAt: now } : e)))
  }, [key, entries])

  const remove = useCallback(async (id: number) => {
    await dbDeleteEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const exportJson = useCallback(async () => {
    const { meta, entries } = await getAllData()
    const payload = { version: 1, meta, entries }
    return JSON.stringify(payload)
  }, [])

  const importJson = useCallback(async (json: string) => {
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') throw new Error('Bestand ongeldig')
    if (!parsed.meta || !parsed.entries) throw new Error('Bestand mist gegevens')
    await replaceAll(parsed.meta, parsed.entries)
    // Vereis opnieuw ontgrendelen met het (nieuwe) hoofdwachtwoord
    setIsExistingVault(true)
    setIsUnlocked(false)
    setKey(null)
    setEntries([])
  }, [])

  const value = useMemo<VaultContextValue>(() => ({
    isExistingVault,
    isUnlocked,
    unlock,
    createVault,
    lock,
    entries,
    add,
    update,
    remove,
    searchTerm,
    setSearchTerm,
    exportJson,
    importJson,
  }), [isExistingVault, isUnlocked, unlock, createVault, lock, entries, add, update, remove, searchTerm, exportJson, importJson])

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}