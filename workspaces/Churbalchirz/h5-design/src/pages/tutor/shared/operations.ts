export function createRequestScope(identity: () => string | null) {
  let generation = 0
  return {
    begin() {
      const version = ++generation
      const owner = identity()
      return { isCurrent: () => version === generation && owner === identity() }
    },
    invalidate() { generation++ }
  }
}
export async function runConfirmedAction<T>(options: { confirm: () => Promise<boolean>; execute: () => Promise<T> }): Promise<{ kind: 'cancelled' } | { kind: 'success'; value: T }> {
  if (!await options.confirm()) return { kind: 'cancelled' }
  return { kind: 'success', value: await options.execute() }
}
