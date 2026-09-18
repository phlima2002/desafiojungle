import { useLayoutEffect } from 'react'

/**
 * Hand-off between the build-time shell (`static-shell.ts`) and the React tree.
 *
 * The shell sits next to `#root`, not inside it, and `#root` starts hidden.
 * Without that, React's first commit would replace an already-painted artwork
 * with a loading skeleton and paint it again a second later — a visible blink
 * on exactly the element the visitor came for.
 *
 * So the shell stays on screen until the first screen can be drawn for real.
 * Anything whose absence would show a skeleton where the shell shows content
 * holds the hand-off with `useShellHold`; when the last hold is released the
 * shell is removed and `#root` is revealed, in the same frame.
 *
 * A hold is never allowed to strand the page: `MAX_HOLD_MS` after boot the
 * hand-off happens regardless, so a stuck query degrades to the ordinary
 * skeleton instead of a blank screen.
 */
const MAX_HOLD_MS = 2_500

let holds = 0
let finished = false

export function finishShellHandoff(): void {
  if (finished || typeof document === 'undefined') return
  finished = true
  document.getElementById('shell')?.remove()
  const root = document.getElementById('root')
  if (root) root.style.removeProperty('display')
}

/** Called after every commit: hands off as soon as nothing is holding. */
export function tryFinishShellHandoff(): void {
  if (holds === 0) finishShellHandoff()
}

export function startShellHandoffDeadline(): void {
  if (typeof window === 'undefined') return
  window.setTimeout(finishShellHandoff, MAX_HOLD_MS)
}

/**
 * Holds the shell while `pending` is true. Registered in a layout effect, which
 * runs before the root's effect, so the root never hands off in a commit where
 * a child still needs to hold.
 */
export function useShellHold(pending: boolean): void {
  useLayoutEffect(() => {
    if (finished || !pending) return
    holds += 1
    return () => {
      holds -= 1
    }
  }, [pending])
}
