import { Router, type IRouter } from "express";
import { db, tasksTable, completionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListTasksQueryParams, ListTasksResponse,
  CreateTaskBody,
  GetTaskParams, GetTaskResponse,
  UpdateTaskParams, UpdateTaskBody, UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function formatTask(task: any, userCompleted?: boolean) {
  return {
    ...task,
    reward: Number(task.reward),
    userCompleted: userCompleted ?? null,
  };
}

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const params = ListTasksQueryParams.safeParse(req.query);
  const activeOnly = params.success ? params.data.activeOnly : undefined;

  let tasks = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);
  if (activeOnly) {
    tasks = tasks.filter(t => t.isActive);
  }

  // Check which tasks the current user completed today
  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userCompletions = await db
    .select({ taskId: completionsTable.taskId })
    .from(completionsTable)
    .where(
      and(
        eq(completionsTable.userId, userId),
        sql`${completionsTable.createdAt} >= ${today}`
      )
    );

  const completedTaskIds = new Set(userCompletions.map(c => c.taskId));

  const result = tasks.map(t => formatTask(t, completedTaskIds.has(t.id)));
  res.json(ListTasksResponse.parse(result));
});

router.post("/tasks", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    ...parsed.data,
    reward: String(parsed.data.reward),
  }).returning();
  res.status(201).json(formatTask(task, false));
});

router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const p = GetTaskParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, p.data.id)).limit(1);
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [completion] = await db
    .select()
    .from(completionsTable)
    .where(
      and(
        eq(completionsTable.userId, userId),
        eq(completionsTable.taskId, p.data.id),
        sql`${completionsTable.createdAt} >= ${today}`
      )
    )
    .limit(1);

  res.json(GetTaskResponse.parse(formatTask(task, !!completion)));
});

router.patch("/tasks/:id", requireAdmin, async (req, res): Promise<void> => {
  const p = UpdateTaskParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const b = UpdateTaskBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: b.error.message }); return; }

  const updateData: any = { ...b.data };
  if (b.data.reward !== undefined) updateData.reward = String(b.data.reward);

  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, p.data.id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(UpdateTaskResponse.parse(formatTask(task)));
});

router.delete("/tasks/:id", requireAdmin, async (req, res): Promise<void> => {
  const p = DeleteTaskParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, p.data.id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.sendStatus(204);
});

export default router;
