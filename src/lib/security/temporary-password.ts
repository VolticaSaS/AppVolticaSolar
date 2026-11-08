import { randomInt } from "node:crypto";

const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const lowercase = "abcdefghijkmnopqrstuvwxyz";
const digits = "23456789";
const symbols = "!@#$%*-_";
const alphabet = uppercase + lowercase + digits + symbols;

function pick(characters: string): string {
  return characters[randomInt(characters.length)];
}

/** Generates a one-time password that meets the app policy and is easier to type. */
export function generateTemporaryPassword(): string {
  const characters = [pick(uppercase), pick(lowercase), pick(digits), pick(symbols)];
  while (characters.length < 12) characters.push(pick(alphabet));
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}
