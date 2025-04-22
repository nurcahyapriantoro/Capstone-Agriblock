import crypto from 'crypto';

/**
 * Mengenkripsi private key menggunakan password user dengan metode sederhana
 * Catatan: Metode ini aman untuk demonstrasi tetapi untuk produksi
 * sebaiknya gunakan library khusus seperti crypto-js
 */
export function encryptPrivateKey(privateKey: string, password: string): string {
  // Generate salt acak
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Buat derived key dari password dan salt
  const derivedKey = crypto.createHash('sha256')
    .update(password + salt)
    .digest('hex');
  
  // Split derived key menjadi encryption key dan iv
  const encryptionKey = derivedKey.substring(0, 32);
  const iv = derivedKey.substring(32, 48);
  
  // Enkripsi dengan XOR sederhana
  let encrypted = '';
  for (let i = 0; i < privateKey.length; i++) {
    const charCode = privateKey.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
    encrypted += String.fromCharCode(charCode);
  }
  
  // Konversi ke base64 dan gabungkan dengan salt
  const encryptedBase64 = Buffer.from(encrypted).toString('base64');
  return `${salt}:${encryptedBase64}`;
}

/**
 * Mendekripsi private key menggunakan password user
 */
export function decryptPrivateKey(encryptedData: string, password: string): string {
  try {
    // Pisahkan salt dan encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = parts[0];
    const encryptedBase64 = parts[1];
    
    // Decode base64
    const encrypted = Buffer.from(encryptedBase64, 'base64').toString();
    
    // Buat derived key dari password dan salt
    const derivedKey = crypto.createHash('sha256')
      .update(password + salt)
      .digest('hex');
    
    // Split derived key menjadi encryption key dan iv
    const encryptionKey = derivedKey.substring(0, 32);
    
    // Dekripsi dengan XOR
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt private key: Invalid password');
  }
} 