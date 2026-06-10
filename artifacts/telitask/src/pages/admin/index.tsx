import { useGetAdminDashboard, useGetGroupSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, CheckSquare, Wallet, Bell, ChevronRight, TrendingUp, ClipboardList } from "lucide-react";
import BottomNav from "@/components/nav";

const adminLinks = [
  { href: "/admin/tasks", icon: CheckSquare, label: "Task Management", desc: "Create, edit, delete tasks" },
  { href: "/admin/completions", icon: ClipboardList, label: "Completions", desc: "Approve or reject submissions" },
  { href: "/admin/withdrawals", icon: Wallet, label: "Withdrawals", desc: "Process withdrawal requests" },
  { href: "/admin/users", icon: Users, label: "Users", desc: "Manage users, ban/unban" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications", desc: "Send broadcast messages" },
];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminDashboard();
  const { data: group } = useGetGroupSummary();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Admin Panel</h1>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Users", value: stats.totalUsers, sub: `+${stats.todayNewUsers} today` },
              { label: "Total Tasks", value: stats.totalTasks, sub: "active tasks" },
              { label: "Pending Reviews", value: stats.pendingCompletions, sub: "completions" },
              { label: "Pending Payouts", value: stats.pendingWithdrawals, sub: "withdrawals" },
              { label: "Total Payout", value: `$${Number(stats.totalPayout).toFixed(2)}`, sub: "paid out" },
              { label: "Today Tasks", value: stats.todayCompletions, sub: "completed today" },
            ].map(({ label, value, sub }) => (
              <Card key={label}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold mt-0.5">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {group && (
          <Card className="border-blue-100 bg-blue-50/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Telegram Group Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid grid-cols-2 gap-2">
              <div><p className="text-xs text-muted-foreground">Users</p><p className="font-bold">{group.totalUsers}</p></div>
              <div><p className="text-xs text-muted-foreground">Today New</p><p className="font-bold">{group.todayNewUsers}</p></div>
              <div><p className="text-xs text-muted-foreground">Tasks Done</p><p className="font-bold">{group.completedTasks}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Payout</p><p className="font-bold">${Number(group.totalPayout).toFixed(2)}</p></div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {adminLinks.map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="cursor-pointer hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
