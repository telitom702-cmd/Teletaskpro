import { useState } from "react";
import { useListAllWithdrawals, useApproveWithdrawal, useRejectWithdrawal, getListAllWithdrawalsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/nav";

function WithdrawalList({ status }: { status?: "pending" | "approved" | "rejected" }) {
  const { data, isLoading } = useListAllWithdrawals(status ? { status } : undefined);
  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListAllWithdrawalsQueryKey() });
    qc.invalidateQueries({ queryKey: getListAllWithdrawalsQueryKey({ status: "pending" }) });
    qc.invalidateQueries({ queryKey: getListAllWithdrawalsQueryKey({ status: "approved" }) });
    qc.invalidateQueries({ queryKey: getListAllWithdrawalsQueryKey({ status: "rejected" }) });
  };

  const handleApprove = (id: number) => {
    approve.mutate({ id }, {
      onSuccess: () => { toast({ title: "Withdrawal approved!" }); refresh(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleReject = () => {
    if (!rejectId) return;
    reject.mutate({ id: rejectId, data: reason ? { reason } : {} }, {
      onSuccess: () => { toast({ title: "Rejected. Balance refunded." }); setRejectId(null); setReason(""); refresh(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  if (isLoading) return <p className="text-center text-muted-foreground py-8">Loading...</p>;
  if (!data?.withdrawals?.length) return <p className="text-center text-muted-foreground py-8">No withdrawals</p>;

  return (
    <>
      <div className="space-y-3">
        {data.withdrawals.map(w => (
          <Card key={w.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm">${Number(w.amount).toFixed(2)} via {w.method.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">To: {w.accountNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.user?.firstName ?? "User"} {w.user?.username ? `@${w.user.username}` : `#${w.userId}`}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{w.status}</Badge>
              </div>
              {w.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(w.id)} disabled={approve.isPending}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setRejectId(w.id); setReason(""); }}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                  </Button>
                </div>
              )}
              {w.rejectionReason && <p className="text-xs text-destructive mt-1">{w.rejectionReason}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!rejectId} onOpenChange={open => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Withdrawal</DialogTitle></DialogHeader>
          <Input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminWithdrawals() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold">Withdrawals</h1>
      </header>
      <div className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4"><WithdrawalList status="pending" /></TabsContent>
          <TabsContent value="approved" className="mt-4"><WithdrawalList status="approved" /></TabsContent>
          <TabsContent value="rejected" className="mt-4"><WithdrawalList status="rejected" /></TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}
