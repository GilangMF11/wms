import { v4 as uuid } from 'uuid';

let counter = 0;

export function generateNumber(prefix: string, date: Date = new Date()): string {
  counter += 1;
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(counter).padStart(4, '0');
  return `${prefix}-${y}${m}${d}-${seq}`;
}
