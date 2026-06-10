import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, CheckSquare, Bell, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import BottomNav from "@/components/nav";

const statusIcons = {
  pending: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
};
const statusColors = {
  pending: "text-amber-500",
  approved: "text-green-500",
  rejected: "text-destructive",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load dashboard</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Retry</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base">Hi, {dashboard.user.firstName}!</h1>
            <p className="text-xs text-muted-foreground">TeliTask Pro</p>
          </div>
          <Link href="/notifications">
            <button className="relative p-2">
              <Bell className="w-5 h-5" />
              {dashboard.unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <p className="text-sm opacity-80">Current Balance</p>
            <p className="text-4xl font-bold mt-1">${Number(dashboard.user.balance).toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-2 opacity-80">
              <TrendingUp className="w-3.5 h-3.5" />
              <p className="text-sm">Today: +${Number(dashboard.todayEarned).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/tasks">
            <Card className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Available Tasks</p>
                </div>
                <p className="text-2xl font-bold">{dashboard.availableTasks}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/wallet">
            <Card className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">Pending Payouts</p>
                </div>
                <p className="text-2xl font-bold">{dashboard.pendingWithdrawals}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <p className="text-xs text-muted-foreground">Tasks Done</p>
                </div>
                <p className="text-2xl font-bold">{dashboard.user.completedTasksCount}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/notifications">
            <Card className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-purple-500" />
                  <p className="text-xs text-muted-foreground">Unread</p>
                </div>
                <p className="text-2xl font-bold">{dashboard.unreadNotifications}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Completions */}
        {dashboard.recentCompletions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Recent Tasks</h2>
              <Link href="/history"><span className="text-xs text-primary">View all</span></Link>
            </div>
            <div className="space-y-2">
              {dashboard.recentCompletions.map(c => {
                const Icon = statusIcons[c.status as keyof typeof statusIcons] ?? AlertCircle;
                const color = statusColors[c.status as keyof typeof statusColors] ?? "text-muted-foreground";
                return (
                  <Card key={c.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                        <div>
                          <p className="text-sm font-medium">{c.task?.title ?? `Task #${c.taskId}`}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${c.status === "approved" ? "text-green-600" : "text-muted-foreground"}`}>
                        {c.status === "approved" ? "+" : ""} ${Number(c.reward).toFixed(2)}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
