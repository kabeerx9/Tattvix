// RFC 4122 v4 UUID for idempotency keys. Hermes does not guarantee a global
// crypto.randomUUID and no expo-crypto is installed, so this builds one from
// Math.random. The key only needs to be unique per charge attempt, not secret.
export function randomUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
