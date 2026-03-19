import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />;
}

export default function OverviewLoading() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
        <Skeleton className="h-5 w-48" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-5 py-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-8 w-24" />
              <Skeleton className="mt-2 h-5 w-16 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Problems */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardContent className="px-5 py-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-5 py-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
