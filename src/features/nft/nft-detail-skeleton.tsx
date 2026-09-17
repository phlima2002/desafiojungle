export function NftDetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-page gap-10 px-4 py-10 sm:px-8 lg:grid-cols-2" aria-hidden>
      <div className="skeleton aspect-square w-full rounded-lg" />
      <div className="space-y-4">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-12 w-48" />
      </div>
    </div>
  )
}
