import { useListTasks } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, DollarSign, CheckCircle, Link as LinkIcon, Camera } from "lucide-react";
import BottomNav from "@/components/nav";

export default function Tasks() {
  const { data: tasks, isLoading } = useListTasks({ activeOnly: true });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Available Tasks</h1>
      </header>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : !tasks?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tasks available</p>
            <p className="text-sm mt-1">Check back later for new tasks</p>
          </div>
        ) : (
          tasks.map(task => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <Card className={`cursor-pointer transition-all hover:shadow-md ${task.userCompleted ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                        {task.userCompleted && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />{task.timeLimitMinutes}m
                        </span>
                        {task.requiresScreenshot && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Camera className="w-3 h-3" />Screenshot
                          </span>
                        )}
                        {task.requiresLinkCopy && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <LinkIcon className="w-3 h-3" />Link
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-green-700 bg-green-50 border border-green-100 font-semibold text-sm">
                        <DollarSign className="w-3 h-3 mr-0.5" />{Number(task.reward).toFixed(2)}
                      </Badge>
                      {task.userCompleted ? (
                        <Badge variant="outline" className="text-xs">Done</Badge>
                      ) : (
                        <Badge className="text-xs">Available</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
