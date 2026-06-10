import { Link, useLocation } from "wouter";
import { Home, CheckSquare, Clock, Wallet, Bell, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetMe, useListNotifications } from "@workspace/api-client-react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
  { href: "/notifications", icon: Bell, label: "Alerts" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { data: notifications } = useListNotifications();
  const { data: me } = useGetMe();

  const unread = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-1 py-2 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <button
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[44px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  {label === "Alerts" && unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-medium leading-none", isActive ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
        {me?.isAdmin && (
          <Link href="/admin">
            <button
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[44px]",
                location.startsWith("/admin") ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Settings className="w-5 h-5" strokeWidth={location.startsWith("/admin") ? 2.5 : 1.8} />
              <span className={cn("text-[10px] font-medium leading-none", location.startsWith("/admin") ? "text-primary" : "text-muted-foreground")}>
                Admin
              </span>
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}
