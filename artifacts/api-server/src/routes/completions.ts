import { Router, type IRouter } from "express";
import { db, completionsTable, tasksTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  CompleteTaskParams, CompleteTaskBody,
  ListMyCompletionsResponse,
  ListAllCompletionsQueryParams, ListAllCompletionsResponse,
  ApproveCompletionParams, ApproveCompletionResponse,
  RejectCompletionParams, RejectCompletionBody, RejectCompletionResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram";

const router: IRouter = Router();

function formatCompletion(c: any, task?: any, user?: any) {
  return {
    ...c,
    reward: Number(c.reward),
    task: task ? { ...task, reward: Number(task.reward), userCompleted: null } : undefined,
    user: user ? { ...user, balance: Number(user.balance), totalEarned: Number(user.totalEarned), totalWithdrawn: Number(user.totalWithdrawn) } : undefined,
  };
}

router.post("/tasks/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const p = CompleteTaskParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const b = CompleteTaskBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: b.error.message }); return; }

  const userId = req.user!.userId;
  const taskId = p.data.id;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
  if (!task || !task.isActive) {
    res.status(404).json({ error: "Task not found or inactive" });
    return;
  }

  // Check daily limit (0 = one-time only)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingCompletions = await db
    .select()
    .from(completionsTable)
    .where(and(eq(completionsTable.userId, userId), eq(completionsTable.taskId, taskId)));

  if (task.dailyLimit === 0) {
    // One-time task
    if (existingCompletions.length > 0) {
      res.status(400).json({ error: "You have already completed this task" });
      return;
    }
  } else {
    const todayCompletions = existingCompletions.filter(
      c => new Date(c.createdAt) >= today
    );
    if (todayCompletions.length >= task.dailyLimit) {
      res.status(400).json({ error: "Daily completion limit reached for this task" });
      return;
    }
  }

  const [completion] = await db.insert(completionsTable).values({
    userId,
    taskId,
    status: "pending",
    screenshotUrl: b.data.screenshotUrl || null,
    reward: task.reward,
  }).returning();

  // Increment task completion count
  await db.update(tasksTable)
    .set({ completionCount: sql`${tasksTable.completionCount} + 1` })
    .where(eq(tasksTable.id, taskId));

  res.status(201).json(formatCompletion(completion, task));
});

router.get("/completions/mine", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const completions = await db
    .select({
      completion: completionsTable,
      task: tasksTable,
    })
    .from(completionsTable)
    .leftJoin(tasksTable, eq(completionsTable.taskId, tasksTable.id))
    .where(eq(completionsTable.userId, userId))
    .orderBy(desc(completionsTable.createdAt));

  const result = completions.map(({ completion, task }) => formatCompletion(completion, task));
  res.json(ListMyCompletionsResponse.parse(result));
});

router.get("/completions", requireAdmin, async (req, res): Promise<void> => {
  const params = ListAllCompletionsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const status = params.success ? params.data.status : undefined;
  const limit = 20;
  const offset = (page - 1) * limit;

  let baseQuery = db
    .select({ completion: completionsTable, task: tasksTable, user: usersTable })
    .from(completionsTable)
    .leftJoin(tasksTable, eq(completionsTable.taskId, tasksTable.id))
    .leftJoin(usersTable, eq(completionsTable.userId, usersTable.id));

  if (status) {
    baseQuery = baseQuery.where(eq(completionsTable.status, status)) as typeof baseQuery;
  }

  const rows = await baseQuery.orderBy(desc(completionsTable.createdAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(completionsTable);

  const completions = rows.map(({ completion, task, user }) => formatCompletion(completion, task, user));
  res.json(ListAllCompletionsResponse.parse({ completions, total: Number(total), page }));
});

router.patch("/completions/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const p = ApproveCompletionParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

  const [existing] = await db.select().from(completionsTable).where(eq(completionsTable.id, p.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Completion not found" }); return; }
  if (existing.status !== "pending") {
    res.status(400).json({ error: "Completion already processed" });
    return;
  }

  const [completion] = await db
    .update(completionsTable)
    .set({ status: "approved" })
    .where(eq(completionsTable.id, p.data.id))
    .returning();

  // Credit user balance
  const reward = Number(existing.reward);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
  if (user) {
    await db.update(usersTable).set({
      balance: String(Number(user.balance) + reward),
      totalEarned: String(Number(user.totalEarned) + reward),
      completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
    }).where(eq(usersTable.id, existing.userId));

    // Notify user
    sendTelegramMessage(user.telegramId, `Task approved! +$${reward.toFixed(2)} added to your balance.`);
  }

  res.json(ApproveCompletionResponse.parse(formatCompletion(completion)));
});

router.patch("/completions/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const p = RejectCompletionParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const b = RejectCompletionBody.safeParse(req.body);

  const [existing] = await db.select().from(completionsTable).where(eq(completionsTable.id, p.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Completion not found" }); return; }

  const [completion] = await db
    .update(completionsTable)
    .set({ status: "rejected", rejectionReason: b.success ? (b.data.reason || null) : null })
    .where(eq(completionsTable.id, p.data.id))
    .returning();

  // Notify user
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
  if (user) {
    const reason = b.success ? b.data.reason : undefined;
    sendTelegramMessage(user.telegramId, `Task submission rejected.${reason ? ` Reason: ${reason}` : ""}`);
  }

  res.json(RejectCompletionResponse.parse(formatCompletion(completion)));
});

export default router;
