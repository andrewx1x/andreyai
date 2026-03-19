import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />;
}

export default function AdsLoading() {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <Skeleton className="h-5 w-40" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-5 py-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-2 h-5 w-14 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spend chart */}
      <Card>
        <CardContent className="px-5 py-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-4 h-[240px] w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Three columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-5 py-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-[150px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
