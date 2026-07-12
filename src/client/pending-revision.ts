export function pendingRevisionAfterDispatch(revision: number, dispatched: boolean): number | null {
  return dispatched ? revision : null;
}
