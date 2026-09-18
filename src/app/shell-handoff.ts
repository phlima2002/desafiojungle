/**
 * Hand-off between the build-time shell (`static-shell.ts`) and the React tree.
 *
 * The shell sits next to `#root`, not inside it, and `#root` starts hidden, so
 * the two never show at once. This swaps them on React's first commit: from
 * that point the application draws the same artwork the shell was showing —
 * `HomeHero` and `NftDetailSkeleton` keep it on screen while their queries are
 * in flight, precisely so the hand-off costs nothing visually.
 *
 * There is deliberately no timer forcing the swap. If the bundle never boots,
 * the shell staying up is the better failure: revealing an empty `#root` would
 * trade a header and an artwork for a blank page.
 */
let finished = false

export function finishShellHandoff(): void {
  if (finished || typeof document === 'undefined') return
  finished = true
  document.getElementById('shell')?.remove()
  document.getElementById('root')?.style.removeProperty('display')
}
