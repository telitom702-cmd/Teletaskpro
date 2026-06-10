import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useGetTask, useCompleteTask, useUploadScreenshot } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Camera, Link as LinkIcon, CheckCircle, Copy } from "lucide-react";

export default function TaskDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const taskId = parseInt(params.id, 10);

  const { data: task, isLoading } = useGetTask(taskId);
  const completeTask = useCompleteTask();
  const uploadScreenshot = useUploadScreenshot();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (started && task && timeLeft === null) {
      setTimeLeft(task.timeLimitMinutes * 60);
    }
  }, [started, task]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = async () => {
    if (task?.copyLink) {
      await navigator.clipboard.writeText(task.copyLink);
      setLinkCopied(true);
      toast({ title: "Link copied!", description: "Link has been copied to clipboard" });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        const result = await uploadScreenshot.mutateAsync({
          data: { data: base64, filename: file.name }
        });
        setScreenshotUrl(result.url);
        toast({ title: "Screenshot uploaded" });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (task?.requiresScreenshot && !screenshotUrl) {
      toast({ title: "Screenshot required", description: "Please upload a screenshot first", variant: "destructive" });
      return;
    }
    if (task?.requiresLinkCopy && !linkCopied) {
      toast({ title: "Copy the link first", description: "Please copy the required link", variant: "destructive" });
      return;
    }
    if (timeLeft !== null && timeLeft <= 0) {
      toast({ title: "Time expired", variant: "destructive" });
      return;
    }

    completeTask.mutate(
      { id: taskId, data: { screenshotUrl: screenshotUrl || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Task submitted!", description: "Awaiting admin approval" });
          setLocation("/history");
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err?.data?.error || "Could not submit task", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  if (!task) return (
    <div className="p-4 text-center">
      <p className="text-muted-foreground">Task not found</p>
      <Button variant="outline" className="mt-4" onClick={() => setLocation("/tasks")}>Back</Button>
    </div>
  );

  const expired = timeLeft !== null && timeLeft <= 0;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/tasks")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold flex-1 truncate">{task.title}</h1>
        <Badge variant="secondary" className="text-green-700 bg-green-50 font-semibold">
          ${Number(task.reward).toFixed(2)}
        </Badge>
      </header>

      <div className="p-4 space-y-4">
        {task.userCompleted && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium text-sm">You have already completed this task today</span>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm leading-relaxed">{task.description}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Time Limit</p>
                <p className="font-semibold text-sm">{task.timeLimitMinutes}m</p>
              </div>
            </CardContent>
          </Card>
          {started && timeLeft !== null && (
            <Card className={expired ? "border-destructive" : ""}>
              <CardContent className="p-3 flex items-center gap-2">
                <Clock className={`w-4 h-4 ${expired ? "text-destructive" : "text-amber-500"}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Time Left</p>
                  <p className={`font-semibold text-sm ${expired ? "text-destructive" : ""}`}>{formatTime(timeLeft)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {!started && !task.userCompleted && (
          <Button className="w-full" size="lg" onClick={() => setStarted(true)}>
            Start Task
          </Button>
        )}

        {started && !task.userCompleted && (
          <div className="space-y-3">
            {task.requiresLinkCopy && task.copyLink && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">Copy the required link:</p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{task.copyLink}</span>
                    <Button
                      variant={linkCopied ? "outline" : "default"}
                      size="sm"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      {linkCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {task.requiresScreenshot && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">Upload screenshot:</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {screenshotUrl ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Screenshot uploaded</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Select Screenshot"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={completeTask.isPending || expired}
            >
              {completeTask.isPending ? "Submitting..." : expired ? "Time Expired" : "Submit Task"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
