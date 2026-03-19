import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />;
}

export default function SiteLoading() {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <Skeleton className="h-5 w-40" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-5 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-2 h-5 w-14 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart placeholder */}
      <Card>
        <CardContent className="px-5 py-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-[240px] w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="px-5 py-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-5 py-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-[200px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
