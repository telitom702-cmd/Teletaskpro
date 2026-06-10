import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, CheckCircle, Trophy, DollarSign, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import BottomNav from "@/components/nav";

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const { logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyReferral = async () => {
    if (me?.referralCode) {
      await navigator.clipboard.writeText(me.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return (
    <div className="p-4 space-y-4 pb-20">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );

  if (!me) return null;

  const initials = `${me.firstName.charAt(0)}${me.lastName?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Profile</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={me.photoUrl ?? undefined} />
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold truncate">{me.firstName} {me.lastName}</h2>
                {me.isAdmin && <Badge variant="default" className="text-xs">Admin</Badge>}
              </div>
              {me.username && <p className="text-sm text-muted-foreground">@{me.username}</p>}
              <p className="text-xs text-muted-foreground">ID: {me.telegramId}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-lg font-bold">${Number(me.balance).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Balance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-lg font-bold">${Number(me.totalEarned).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold">{me.completedTasksCount}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </CardContent>
          </Card>
        </div>

        {me.referralCode && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Referral Code</p>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                <span className="text-sm font-mono flex-1">{me.referralCode}</span>
                <Button variant="ghost" size="sm" onClick={handleCopyReferral}>
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={logout}>
          Sign Out
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
