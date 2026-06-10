import { useState } from "react";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft, DollarSign, Camera, Link } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/nav";

const emptyForm = { title: "", description: "", reward: "", timeLimitMinutes: "30", isActive: true, requiresScreenshot: false, requiresLinkCopy: false, copyLink: "", dailyLimit: "1" };

export default function AdminTasks() {
  const [, setLocation] = useLocation();
  const { data: tasks, isLoading } = useListTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => qc.invalidateQueries({ queryKey: getListTasksQueryKey() });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (task: any) => {
    setForm({
      title: task.title, description: task.description, reward: String(task.reward),
      timeLimitMinutes: String(task.timeLimitMinutes), isActive: task.isActive,
      requiresScreenshot: task.requiresScreenshot, requiresLinkCopy: task.requiresLinkCopy,
      copyLink: task.copyLink || "", dailyLimit: String(task.dailyLimit),
    });
    setEditId(task.id); setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title || !form.description || !form.reward) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    const data = {
      title: form.title, description: form.description, reward: parseFloat(form.reward),
      timeLimitMinutes: parseInt(form.timeLimitMinutes), isActive: form.isActive,
      requiresScreenshot: form.requiresScreenshot, requiresLinkCopy: form.requiresLinkCopy,
      copyLink: form.copyLink || undefined, dailyLimit: parseInt(form.dailyLimit),
    };
    if (editId) {
      updateTask.mutate({ id: editId, data }, {
        onSuccess: () => { toast({ title: "Task updated" }); setShowForm(false); refresh(); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createTask.mutate({ data }, {
        onSuccess: () => { toast({ title: "Task created" }); setShowForm(false); refresh(); },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => { toast({ title: "Task deleted" }); setDeleteId(null); refresh(); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold flex-1">Task Management</h1>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />New</Button>
      </header>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : !tasks?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">No tasks yet</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create First Task</Button>
          </div>
        ) : (
          tasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <Badge variant={task.isActive ? "default" : "secondary"} className="text-xs flex-shrink-0">
                        {task.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600"><DollarSign className="w-3 h-3" />{Number(task.reward).toFixed(2)}</span>
                      {task.requiresScreenshot && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Camera className="w-3 h-3" />Screenshot</span>}
                      {task.requiresLinkCopy && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Link className="w-3 h-3" />Link</span>}
                      <span className="text-xs text-muted-foreground">{task.completionCount} done</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(task.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Task" : "Create Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" /></div>
            <div className="space-y-1"><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task instructions" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Reward ($) *</Label><Input type="number" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} placeholder="0.50" /></div>
              <div className="space-y-1"><Label>Time Limit (min)</Label><Input type="number" value={form.timeLimitMinutes} onChange={e => setForm(f => ({ ...f, timeLimitMinutes: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Daily Limit (0=once ever)</Label><Input type="number" value={form.dailyLimit} onChange={e => setForm(f => ({ ...f, dailyLimit: e.target.value }))} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} /></div>
            <div className="flex items-center justify-between"><Label>Requires Screenshot</Label><Switch checked={form.requiresScreenshot} onCheckedChange={v => setForm(f => ({ ...f, requiresScreenshot: v }))} /></div>
            <div className="flex items-center justify-between"><Label>Requires Link Copy</Label><Switch checked={form.requiresLinkCopy} onCheckedChange={v => setForm(f => ({ ...f, requiresLinkCopy: v }))} /></div>
            {form.requiresLinkCopy && <div className="space-y-1"><Label>Copy Link URL</Label><Input value={form.copyLink} onChange={e => setForm(f => ({ ...f, copyLink: e.target.value }))} placeholder="https://..." /></div>}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTask.isPending || updateTask.isPending}>
              {createTask.isPending || updateTask.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
}
