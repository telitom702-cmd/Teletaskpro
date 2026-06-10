import { useState } from "react";
import { useListAllCompletions, useApproveCompletion, useRejectCompletion, getListAllCompletionsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/nav";

function CompletionList({ status }: { status?: "pending" | "approved" | "rejected" }) {
  const { data, isLoading } = useListAllCompletions(status ? { status } : undefined);
  const approve = useApproveCompletion();
  const reject = useRejectCompletion();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListAllCompletionsQueryKey() });
    qc.invalidateQueries({ queryKey: getListAllCompletionsQueryKey({ status: "pending" }) });
    qc.invalidateQueries({ queryKey: getListAllCompletionsQueryKey({ status: "approved" }) });
    qc.invalidateQueries({ queryKey: getListAllCompletionsQueryKey({ status: "rejected" }) });
  };

  const handleApprove = (id: number) => {
    approve.mutate({ id }, {
      onSuccess: () => { toast({ title: "Approved! Balance credited." }); refresh(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleReject = () => {
    if (!rejectId) return;
    reject.mutate({ id: rejectId, data: reason ? { reason } : {} }, {
      onSuccess: () => { toast({ title: "Rejected" }); setRejectId(null); setReason(""); refresh(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  if (isLoading) return <p className="text-center text-muted-foreground py-8">Loading...</p>;
  if (!data?.completions?.length) return <p className="text-center text-muted-foreground py-8">No {status ?? ""}completions</p>;

  return (
    <>
      <div className="space-y-3">
        {data.completions.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-sm">{c.task?.title ?? `Task #${c.taskId}`}</p>
                  <p className="text-xs text-muted-foreground">
                    by {c.user?.firstName ?? "User"} {c.user?.username ? `@${c.user.username}` : `#${c.userId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Reward: ${Number(c.reward).toFixed(2)}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
              </div>
              {c.screenshotUrl && (
                <a href={c.screenshotUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary mb-2">
                  <ExternalLink className="w-3 h-3" />View Screenshot
                </a>
              )}
              {c.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(c.id)} disabled={approve.isPending}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setRejectId(c.id); setReason(""); }}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                  </Button>
                </div>
              )}
              {c.rejectionReason && <p className="text-xs text-destructive mt-1">{c.rejectionReason}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!rejectId} onOpenChange={open => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Completion</DialogTitle></DialogHeader>
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

export default function AdminCompletions() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold">Completions</h1>
      </header>
      <div className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4"><CompletionList status="pending" /></TabsContent>
          <TabsContent value="approved" className="mt-4"><CompletionList status="approved" /></TabsContent>
          <TabsContent value="rejected" className="mt-4"><CompletionList status="rejected" /></TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}
