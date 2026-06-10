import { useState } from "react";
import { useListUsers, useBanUser, useUnbanUser, useAdjustUserBalance, getListUsersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, UserX, UserCheck, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/nav";

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListUsers(search ? { search } : undefined);
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const adjustBalance = useAdjustUserBalance();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [balanceUser, setBalanceUser] = useState<{ id: number; name: string } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleBan = (id: number, isBanned: boolean) => {
    const fn = isBanned ? unbanUser : banUser;
    fn.mutate({ id }, {
      onSuccess: () => { toast({ title: isBanned ? "User unbanned" : "User banned" }); refresh(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleAdjustBalance = () => {
    if (!balanceUser) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    adjustBalance.mutate(
      { id: balanceUser.id, data: { amount, reason: balanceReason || "Admin adjustment" } },
      {
        onSuccess: () => { toast({ title: "Balance adjusted" }); setBalanceUser(null); setBalanceAmount(""); setBalanceReason(""); refresh(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold flex-1">Users</h1>
      </header>

      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, username, or Telegram ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : !data?.users?.length ? (
          <p className="text-center text-muted-foreground py-8">No users found</p>
        ) : (
          data.users.map(u => (
            <Card key={u.id} className={u.isBanned ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={u.photoUrl ?? undefined} />
                    <AvatarFallback>{u.firstName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{u.firstName} {u.lastName ?? ""}</p>
                      {u.isAdmin && <Badge variant="default" className="text-xs">Admin</Badge>}
                      {u.isBanned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">@{u.username || "no username"} · ID: {u.telegramId}</p>
                    <p className="text-xs text-muted-foreground">Balance: ${Number(u.balance).toFixed(2)} · Tasks: {u.completedTasksCount}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`flex-1 ${u.isBanned ? "text-green-600 border-green-200" : "text-destructive border-destructive/30"}`}
                    onClick={() => handleBan(u.id, u.isBanned)}
                    disabled={banUser.isPending || unbanUser.isPending}
                  >
                    {u.isBanned ? <><UserCheck className="w-3.5 h-3.5 mr-1" />Unban</> : <><UserX className="w-3.5 h-3.5 mr-1" />Ban</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setBalanceUser({ id: u.id, name: u.firstName })}
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1" />Balance
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!balanceUser} onOpenChange={open => !open && setBalanceUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Balance — {balanceUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (+ to add, - to subtract)</Label>
              <Input type="number" step="0.01" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="e.g. 5.00 or -2.00" />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input value={balanceReason} onChange={e => setBalanceReason(e.target.value)} placeholder="Admin adjustment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceUser(null)}>Cancel</Button>
            <Button onClick={handleAdjustBalance} disabled={adjustBalance.isPending}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
}
