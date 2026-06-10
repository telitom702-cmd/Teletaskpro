import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Megaphone, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/nav";
import { useQueryClient } from "@tanstack/react-query";

const typeIcons = { broadcast: Megaphone, personal: User, system: Settings };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const qc = useQueryClient();

  const handleRead = (id: number, isRead: boolean) => {
    if (isRead) return;
    markRead.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Notifications</h1>
      </header>

      <div className="p-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : !notifications?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = typeIcons[n.type as keyof typeof typeIcons] ?? Bell;
            return (
              <Card
                key={n.id}
                className={cn("cursor-pointer transition-colors", !n.isRead && "border-primary/30 bg-primary/5")}
                onClick={() => handleRead(n.id, n.isRead)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn("p-2 rounded-full flex-shrink-0", n.isRead ? "bg-muted" : "bg-primary/10")}>
                    <Icon className={cn("w-4 h-4", n.isRead ? "text-muted-foreground" : "text-primary")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-medium", !n.isRead && "text-foreground")}>{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
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
