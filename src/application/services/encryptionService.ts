export interface EncryptionService {
  encrypt(text: string): Promise<string>;
  decrypt(encryptedText: string): Promise<string>;
}
