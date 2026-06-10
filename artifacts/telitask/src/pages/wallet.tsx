import { useState } from "react";
import { useGetMe, useRequestWithdrawal, useListMyWithdrawals } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";
import BottomNav from "@/components/nav";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, getListMyWithdrawalsQueryKey } from "@workspace/api-client-react";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle, className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
};

export default function Wallet() {
  const { data: me, isLoading: meLoading } = useGetMe();
  const { data: withdrawals, isLoading: wLoading } = useListMyWithdrawals();
  const requestWithdrawal = useRequestWithdrawal();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bkash" | "nagad" | "usd">("bkash");
  const [accountNumber, setAccountNumber] = useState("");

  const handleWithdraw = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" }); return;
    }
    if (!accountNumber.trim()) {
      toast({ title: "Account number required", variant: "destructive" }); return;
    }
    requestWithdrawal.mutate(
      { data: { amount: amt, method, accountNumber: accountNumber.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Withdrawal requested!", description: "Admin will process it soon" });
          setAmount(""); setAccountNumber("");
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          qc.invalidateQueries({ queryKey: getListMyWithdrawalsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err?.data?.error || "Could not request withdrawal", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Wallet</h1>
      </header>

      <div className="p-4 space-y-4">
        {meLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : me && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-5">
              <p className="text-sm opacity-80 mb-1">Available Balance</p>
              <p className="text-4xl font-bold mb-4">${Number(me.balance).toFixed(2)}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 opacity-70" />
                  <div>
                    <p className="text-xs opacity-70">Total Earned</p>
                    <p className="font-semibold">${Number(me.totalEarned).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 opacity-70" />
                  <div>
                    <p className="text-xs opacity-70">Total Withdrawn</p>
                    <p className="font-semibold">${Number(me.totalWithdrawn).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Request Withdrawal</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="usd">USD (International)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Account Number</Label>
              <Input
                placeholder={method === "usd" ? "Your payment address" : "01XXXXXXXXX"}
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              {me && <p className="text-xs text-muted-foreground">Available: ${Number(me.balance).toFixed(2)}</p>}
            </div>
            <Button
              className="w-full"
              onClick={handleWithdraw}
              disabled={requestWithdrawal.isPending}
            >
              {requestWithdrawal.isPending ? "Processing..." : "Request Withdrawal"}
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-semibold text-sm mb-3">Withdrawal History</h2>
          {wLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl mb-2" />)
          ) : !withdrawals?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No withdrawal requests yet</p>
          ) : (
            <div className="space-y-2">
              {withdrawals.map(w => {
                const status = statusConfig[w.status as keyof typeof statusConfig];
                const StatusIcon = status.icon;
                return (
                  <Card key={w.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">${Number(w.amount).toFixed(2)} via {w.method.toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">{w.accountNumber}</p>
                        {w.rejectionReason && (
                          <p className="text-xs text-destructive mt-0.5">{w.rejectionReason}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`${status.className} flex items-center gap-1 text-xs`}>
                        <StatusIcon className="w-3 h-3" />{status.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
