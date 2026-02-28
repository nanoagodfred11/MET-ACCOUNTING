import { KG_TO_TROY_OZ } from '~/lib/config/constants';

export function formatTonnes(v: number): string {
  return v < 1 ? v.toFixed(3) : v.toFixed(1);
}

export function formatGrade(v: number): string {
  return v.toFixed(2);
}

export function formatMetal(kg: number): string {
  return kg.toFixed(3);
}

export function formatMetalOz(kg: number): string {
  return (kg * KG_TO_TROY_OZ).toFixed(3);
}

export function formatPercent(v: number): string {
  return v.toFixed(2);
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Parse a YYYY-MM-DD string into a Date at midnight local time */
export function parseISODate(isoDate: string): Date {
  return new Date(isoDate + 'T00:00:00');
}
