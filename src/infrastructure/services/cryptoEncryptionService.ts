import { EncryptionService } from '../../domain/services/encryptionService';
import * as crypto from 'crypto';

export class CryptoEncryptionService implements EncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // AES block size
  private readonly authTagLength = 16; // GCM auth tag length

  constructor() {
    const secretKey = process.env.NOTION_TOKEN_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new Error('NOTION_TOKEN_ENCRYPTION_KEY environment variable is not set.');
    }
    if (Buffer.from(secretKey, 'hex').length !== 32) {
      throw new Error('NOTION_TOKEN_ENCRYPTION_KEY must be a 32-byte hex string.');
    }
    this.key = Buffer.from(secretKey, 'hex');
  }

  async encrypt(text: string): Promise<string> {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  async decrypt(encryptedText: string): Promise<string> {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    const [ivHex, authTagHex, encryptedDataHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedDataHex, 'hex');

    if (iv.length !== this.ivLength) {
      throw new Error(`Invalid IV length. Expected ${this.ivLength} bytes.`);
    }
    if (authTag.length !== this.authTagLength) {
      throw new Error(`Invalid authTag length. Expected ${this.authTagLength} bytes.`);
    }

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }
}
