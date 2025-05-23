import { EncryptionService } from '../../application/services/encryptionService';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size / GCM standard IV length
const AUTH_TAG_LENGTH = 16; // GCM standard auth tag length

export class NodeCryptoEncryptionService implements EncryptionService {
  private key: Buffer;

  constructor(encryptionKey: string) {
    if (!encryptionKey) {
      throw new Error('Encryption key is required and was not provided.');
    }
    if (encryptionKey.length !== 64) { // Ensure key is hex and 32 bytes (256 bits)
        throw new Error('Encryption key must be a 64-character hex string (32 bytes).');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
    if (this.key.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (256 bits) after hex decoding.');
    }
  }

  async encrypt(text: string): Promise<string> {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      // Prepend IV and authTag to the encrypted text for storage.
      // Format: iv:authTag:encryptedText
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data.');
    }
  }

  async decrypt(encryptedText: string): Promise<string> {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format. Expected iv:authTag:encryptedText');
      }
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      if (iv.length !== IV_LENGTH) {
          throw new Error(`Invalid IV length. Expected ${IV_LENGTH} bytes.`);
      }
      if (authTag.length !== AUTH_TAG_LENGTH) {
          throw new Error(`Invalid authTag length. Expected ${AUTH_TAG_LENGTH} bytes.`);
      }

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      // Do not reveal specific crypto errors to the client in a real app for security reasons
      throw new Error('Failed to decrypt data.');
    }
  }
}
