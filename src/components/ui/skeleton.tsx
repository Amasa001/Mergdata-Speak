import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Skeleton Card for loading states in lists
function SkeletonCard() {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mt-2 mb-4" />
      <Skeleton className="h-4 w-3/4 mb-6" />
      <div className="flex justify-between mt-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex justify-between mt-6 pt-4 border-t">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard }
