export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatReadTime(minutes: number, withSuffix = false): string {
  return withSuffix ? `${minutes} min de lectura` : `${minutes} min`;
}
