export async function runSingleFlight<T>(
  lock: { current: boolean },
  operation: () => Promise<T>,
): Promise<{ accepted: true; value: T } | { accepted: false }> {
  if (lock.current) return { accepted: false }

  lock.current = true
  try {
    return { accepted: true, value: await operation() }
  } finally {
    lock.current = false
  }
}
