export default function EventListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3" aria-label="Загрузка событий">
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:flex-row"
        >
          <div className="h-44 w-full shrink-0 animate-pulse rounded-xl bg-gray-200 sm:h-36 sm:w-48" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="hidden w-44 shrink-0 space-y-3 sm:block">
            <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        </li>
      ))}
    </ul>
  )
}
