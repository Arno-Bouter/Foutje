export type KeyCheck = {
  iv: ArrayBuffer
  ciphertext: ArrayBuffer
}

export async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export async function generateSalt(length = 16): Promise<Uint8Array> {
  return generateRandomBytes(length)
}

export async function deriveAesGcmKey(password: string, salt: Uint8Array, iterations = 210_000): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return key
}

export async function encryptObject(key: CryptoKey, data: unknown): Promise<{ iv: ArrayBuffer; ciphertext: ArrayBuffer }> {
  const iv = await generateRandomBytes(12)
  const enc = new TextEncoder()
  const plaintext = enc.encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  )
  return { iv: iv.buffer, ciphertext }
}

export async function decryptObject<T>(key: CryptoKey, iv: ArrayBuffer, ciphertext: ArrayBuffer): Promise<T> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    ciphertext
  )
  const dec = new TextDecoder()
  const json = dec.decode(decrypted)
  return JSON.parse(json) as T
}

export async function createKeyCheck(key: CryptoKey): Promise<KeyCheck> {
  const constant = 'gk-vault-keycheck'
  const iv = await generateRandomBytes(12)
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(constant)
  )
  return { iv: iv.buffer, ciphertext }
}

export async function verifyKey(key: CryptoKey, check: KeyCheck): Promise<boolean> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(check.iv) },
      key,
      check.ciphertext
    )
    const dec = new TextDecoder()
    return dec.decode(decrypted) === 'gk-vault-keycheck'
  } catch {
    return false
  }
}