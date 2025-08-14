import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { KeyCheck } from './crypto'

export type EntryRecord = {
  id?: number
  iv: ArrayBuffer
  ciphertext: ArrayBuffer
  createdAt: string
  updatedAt: string
  version: number
}

export type MetaRecord = {
  id: 'meta'
  salt: ArrayBuffer
  keyCheck: KeyCheck
}

interface VaultDB extends DBSchema {
  meta: {
    key: 'meta'
    value: MetaRecord
  }
  entries: {
    key: number
    value: EntryRecord
    indexes: { 'by-updatedAt': string }
  }
}

const DB_NAME = 'gk-vault'
const DB_VERSION = 1
let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null

export function getDb(): Promise<IDBPDatabase<VaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true })
          store.createIndex('by-updatedAt', 'updatedAt')
        }
      },
    })
  }
  return dbPromise
}

export async function getMeta(): Promise<MetaRecord | undefined> {
  const db = await getDb()
  return db.get('meta', 'meta')
}

export async function saveMeta(meta: MetaRecord): Promise<void> {
  const db = await getDb()
  await db.put('meta', meta, 'meta')
}

export async function addEntry(record: Omit<EntryRecord, 'id'>): Promise<number> {
  const db = await getDb()
  return db.add('entries', record as EntryRecord)
}

export async function updateEntry(id: number, record: Omit<EntryRecord, 'id'>): Promise<void> {
  const db = await getDb()
  await db.put('entries', { ...record, id })
}

export async function deleteEntry(id: number): Promise<void> {
  const db = await getDb()
  await db.delete('entries', id)
}

export async function listEntries(): Promise<EntryRecord[]> {
  const db = await getDb()
  return db.getAll('entries')
}

export async function getAllData(): Promise<{ meta: MetaRecord | undefined; entries: EntryRecord[] }> {
  const db = await getDb()
  const tx = db.transaction(['meta', 'entries'])
  const meta = await tx.objectStore('meta').get('meta')
  const entries = await tx.objectStore('entries').getAll()
  await tx.done
  return { meta, entries }
}

export async function replaceAll(meta: MetaRecord, entries: EntryRecord[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['meta', 'entries'], 'readwrite')
  await tx.objectStore('meta').clear()
  await tx.objectStore('entries').clear()
  await tx.objectStore('meta').put(meta, 'meta')
  for (const e of entries) {
    await tx.objectStore('entries').put(e)
  }
  await tx.done
}