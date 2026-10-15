export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_POLICY_MESSAGE =
  "La contraseña debe tener al menos 12 caracteres e incluir letras, números y un símbolo (por ejemplo, ! o #).";

export function isStrongPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH
    && password.length <= PASSWORD_MAX_LENGTH
    && /\p{L}/u.test(password)
    && /\p{N}/u.test(password)
    && /[^\p{L}\p{N}\s]/u.test(password);
}
