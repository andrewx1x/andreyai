import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />;
}

export default function EventsLoading() {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-40" />
      </div>

      {Array.from({ length: 3 }).map((_, gi) => (
        <div key={gi} className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Card>
            <CardContent className="divide-y p-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-4">
                  <Skeleton className="mt-0.5 h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
