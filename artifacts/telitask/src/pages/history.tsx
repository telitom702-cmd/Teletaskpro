import { useListMyCompletions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import BottomNav from "@/components/nav";

const statusConfig = {
  pending: { label: "Pending", icon: AlertCircle, className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle, className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function History() {
  const { data: completions, isLoading } = useListMyCompletions();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Task History</h1>
      </header>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : !completions?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No task history yet</p>
            <p className="text-sm mt-1">Complete tasks to see them here</p>
          </div>
        ) : (
          completions.map(c => {
            const status = statusConfig[c.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.task?.title ?? `Task #${c.taskId}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(c.createdAt)}</p>
                      {c.status === "rejected" && c.rejectionReason && (
                        <p className="text-xs text-destructive mt-1">{c.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge variant="outline" className={`${status.className} flex items-center gap-1 text-xs`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                      {c.status === "approved" && (
                        <span className="text-sm font-semibold text-green-600">+${Number(c.reward).toFixed(2)}</span>
                      )}
                      {c.status !== "approved" && (
                        <span className="text-sm font-medium text-muted-foreground">${Number(c.reward).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
