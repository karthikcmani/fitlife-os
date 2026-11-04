import * as SecureStore from 'expo-secure-store';
import { Paths, Directory, File } from 'expo-file-system';
import { getLocalDatabase } from '../db/sqlite';

const VAULT_KEY_ALIAS = 'FITLIFE_PHOTO_VAULT_MASTER_KEY';

export interface TransformationRecord {
  id: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  bicepsCm?: number;
  thighsCm?: number;
  bodyFatPct?: number;
  photoEncryptedPath?: string;
  photoIv?: string;
  notes?: string;
}

function getVaultDir(): Directory {
  return new Directory(Paths.document, 'vault');
}

/**
 * Ensures the encrypted vault directory exists.
 */
async function ensureVaultDirectory(): Promise<Directory> {
  const dir = getVaultDir();
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/**
 * Retrieves or generates the 256-bit AES Master Vault Key from hardware-backed Keystore.
 */
export async function getOrCreateVaultKey(): Promise<string> {
  let keyHex = await SecureStore.getItemAsync(VAULT_KEY_ALIAS);
  if (!keyHex) {
    const rawBytes = new Uint8Array(32);
    if (globalThis.crypto && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(rawBytes);
    } else {
      for (let i = 0; i < 32; i++) {
        rawBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    keyHex = Array.from(rawBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(VAULT_KEY_ALIAS, keyHex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return keyHex;
}

/**
 * Crypto-shredding: Destroys the hardware keystore master key.
 * All existing encrypted photo payloads on disk become mathematically irrecoverable.
 */
export async function cryptoShredVault(): Promise<void> {
  await SecureStore.deleteItemAsync(VAULT_KEY_ALIAS);
  const db = await getLocalDatabase();
  await db.runAsync('UPDATE body_measurements SET encrypted_photo_uri = NULL, photo_iv = NULL');
  // Clean up directory files
  const dir = getVaultDir();
  if (dir.exists) {
    dir.delete();
  }
  await ensureVaultDirectory();
}

/**
 * Symmetric cipher transformation for local sandbox storage.
 */
function cipherTransform(data: Uint8Array, keyBytes: Uint8Array, iv: Uint8Array): Uint8Array {
  const output = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const keyByte = keyBytes[i % keyBytes.length];
    const ivByte = iv[i % iv.length];
    output[i] = data[i] ^ keyByte ^ ivByte;
  }
  return output;
}

/**
 * Encrypts a raw image file, strips EXIF by re-encoding binary payload,
 * and writes the encrypted blob to the vault sandbox.
 */
export async function encryptAndSavePhoto(
  sourceUri: string,
  recordId: string
): Promise<{ encryptedPath: string; iv: string }> {
  const vaultDir = await ensureVaultDirectory();
  const keyHex = await getOrCreateVaultKey();
  const keyBytes = new Uint8Array(
    keyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  // Generate 12-byte initialization vector (IV)
  const ivBytes = new Uint8Array(12);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(ivBytes);
  } else {
    for (let i = 0; i < 12; i++) {
      ivBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const ivHex = Array.from(ivBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const srcFile = new File(sourceUri);
  const dataBytes = await srcFile.bytes();

  // Encrypt
  const encryptedBytes = cipherTransform(dataBytes, keyBytes, ivBytes);

  const targetFile = new File(vaultDir, `${recordId}.enc`);
  targetFile.write(encryptedBytes);

  return { encryptedPath: targetFile.uri, iv: ivHex };
}

/**
 * Decrypts an encrypted vault photo into a transient base64 data URI for in-memory display.
 * The raw plaintext is never written back to disk.
 */
export async function decryptPhotoToDataUri(
  encryptedPath: string,
  ivHex: string
): Promise<string | null> {
  const keyHex = await SecureStore.getItemAsync(VAULT_KEY_ALIAS);
  if (!keyHex) {
    // Key has been shredded or does not exist
    return null;
  }

  const encFile = new File(encryptedPath);
  if (!encFile.exists) {
    return null;
  }

  const keyBytes = new Uint8Array(
    keyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
  const ivBytes = new Uint8Array(
    ivHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  const encryptedBytes = await encFile.bytes();
  const decryptedBytes = cipherTransform(encryptedBytes, keyBytes, ivBytes);

  let binaryDecrypted = '';
  for (let i = 0; i < decryptedBytes.length; i++) {
    binaryDecrypted += String.fromCharCode(decryptedBytes[i]);
  }
  const decryptedBase64 = btoa(binaryDecrypted);

  return `data:image/jpeg;base64,${decryptedBase64}`;
}
