export function isValidInteger(value: string | number): boolean {
  if (typeof value === 'string' && value.trim() === '') return false;
  return Number.isInteger(Number(value));
}
