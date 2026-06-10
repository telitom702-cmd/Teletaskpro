import { useState } from "react";
import { useBroadcastNotification, useSendPersonalNotification } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Megaphone, User } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/nav";

export default function AdminNotifications() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const broadcast = useBroadcastNotification();
  const sendPersonal = useSendPersonalNotification();

  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [pTelegramId, setPTelegramId] = useState("");
  const [pTitle, setPTitle] = useState("");
  const [pMessage, setPMessage] = useState("");

  const handleBroadcast = () => {
    if (!bTitle || !bMessage) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    broadcast.mutate({ data: { title: bTitle, message: bMessage } }, {
      onSuccess: (data) => {
        toast({ title: `Sent to ${data.sent} users!` });
        setBTitle(""); setBMessage("");
      },
      onError: () => toast({ title: "Failed to send", variant: "destructive" }),
    });
  };

  const handlePersonal = () => {
    if (!pTelegramId || !pTitle || !pMessage) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    sendPersonal.mutate({ data: { telegramId: pTelegramId, title: pTitle, message: pMessage } }, {
      onSuccess: () => {
        toast({ title: "Personal notification sent!" });
        setPTelegramId(""); setPTitle(""); setPMessage("");
      },
      onError: (err: any) => toast({ title: err?.data?.error || "User not found", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold">Send Notifications</h1>
      </header>

      <div className="p-4">
        <Tabs defaultValue="broadcast">
          <TabsList className="w-full">
            <TabsTrigger value="broadcast" className="flex-1 gap-2"><Megaphone className="w-4 h-4" />Broadcast</TabsTrigger>
            <TabsTrigger value="personal" className="flex-1 gap-2"><User className="w-4 h-4" />Personal</TabsTrigger>
          </TabsList>

          <TabsContent value="broadcast" className="mt-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Broadcast to All Users</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1"><Label>Title</Label><Input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="Notification title" /></div>
                <div className="space-y-1"><Label>Message</Label><Textarea value={bMessage} onChange={e => setBMessage(e.target.value)} placeholder="Your message..." rows={4} /></div>
                <Button className="w-full" onClick={handleBroadcast} disabled={broadcast.isPending}>
                  <Megaphone className="w-4 h-4 mr-2" />
                  {broadcast.isPending ? "Sending..." : "Send to All Users"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal" className="mt-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Send Personal Notification</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <Label>Telegram User ID</Label>
                  <Input value={pTelegramId} onChange={e => setPTelegramId(e.target.value)} placeholder="e.g. 123456789" />
                </div>
                <div className="space-y-1"><Label>Title</Label><Input value={pTitle} onChange={e => setPTitle(e.target.value)} placeholder="Notification title" /></div>
                <div className="space-y-1"><Label>Message</Label><Textarea value={pMessage} onChange={e => setPMessage(e.target.value)} placeholder="Your message..." rows={4} /></div>
                <Button className="w-full" onClick={handlePersonal} disabled={sendPersonal.isPending}>
                  <User className="w-4 h-4 mr-2" />
                  {sendPersonal.isPending ? "Sending..." : "Send Personal Notification"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}
