export function formatDate(input: string | Date, options?: { includeTime?: boolean }): string {
  const date = input instanceof Date ? input : new Date(input)

  const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0
  const includeTime = options?.includeTime ?? hasTime

  const timeOptions = includeTime
    ? ({
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h24',
      } as const)
    : {}

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...timeOptions,
  })
}
