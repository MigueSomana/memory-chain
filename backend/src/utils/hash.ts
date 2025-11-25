import crypto from 'crypto';

export type HashAlgorithm = 'sha256' | 'sha3-256' | 'keccak256';

export function computeHash(
  buffer: Buffer,
  algorithm: HashAlgorithm = 'sha256'
): string {
  if (algorithm === 'sha256' || algorithm === 'sha3-256') {
    const hash = crypto.createHash(algorithm);
    hash.update(buffer);
    return hash.digest('hex');
  }

  if (algorithm === 'keccak256') {
    // Para mantenerlo simple, por ahora lanzamos error.
    // Podrías integrar una librería externa como `js-sha3`.
    throw new Error('keccak256 no implementado aún');
  }

  throw new Error('Algoritmo de hash no soportado');
}