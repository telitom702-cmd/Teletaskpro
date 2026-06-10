import { Router, type IRouter } from "express";
import { db, usersTable, tasksTable, completionsTable, withdrawalsTable, notificationsTable, groupSummaryTable } from "@workspace/db";
import { eq, and, gte, sql, count, sum, desc } from "drizzle-orm";
import {
  GetDashboardResponse,
  GetAdminDashboardResponse,
  GetGroupSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(u: any) {
  return { ...u, balance: Number(u.balance), totalEarned: Number(u.totalEarned), totalWithdrawn: Number(u.totalWithdrawn) };
}

function formatCompletion(c: any, task?: any) {
  return { ...c, reward: Number(c.reward), task: task ? { ...task, reward: Number(task.reward), userCompleted: null } : undefined };
}

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [activeTasks, todayApproved, pendingWithdrawals, unreadNotifications, recentCompletionsRaw] = await Promise.all([
    db.select({ cnt: count() }).from(tasksTable).where(eq(tasksTable.isActive, true)),
    db.select({ total: sum(completionsTable.reward) }).from(completionsTable)
      .where(and(eq(completionsTable.userId, userId), eq(completionsTable.status, "approved"), gte(completionsTable.createdAt, today))),
    db.select({ cnt: count() }).from(withdrawalsTable).where(and(eq(withdrawalsTable.userId, userId), eq(withdrawalsTable.status, "pending"))),
    db.select({ cnt: count() }).from(notificationsTable).where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false))),
    db.select({ completion: completionsTable, task: tasksTable }).from(completionsTable)
      .leftJoin(tasksTable, eq(completionsTable.taskId, tasksTable.id))
      .where(eq(completionsTable.userId, userId))
      .orderBy(desc(completionsTable.createdAt))
      .limit(5),
  ]);

  const data = {
    user: formatUser(user),
    availableTasks: Number(activeTasks[0]?.cnt ?? 0),
    todayEarned: Number(todayApproved[0]?.total ?? 0),
    pendingWithdrawals: Number(pendingWithdrawals[0]?.cnt ?? 0),
    unreadNotifications: Number(unreadNotifications[0]?.cnt ?? 0),
    recentCompletions: recentCompletionsRaw.map(({ completion, task }) => formatCompletion(completion, task)),
  };

  res.json(GetDashboardResponse.parse(data));
});

router.get("/admin/dashboard", requireAdmin, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, todayNewUsers, totalTasks, pendingCompletions, pendingWithdrawals, totalPayoutResult, todayCompletions, totalEarnedResult] = await Promise.all([
    db.select({ cnt: count() }).from(usersTable),
    db.select({ cnt: count() }).from(usersTable).where(gte(usersTable.createdAt, today)),
    db.select({ cnt: count() }).from(tasksTable),
    db.select({ cnt: count() }).from(completionsTable).where(eq(completionsTable.status, "pending")),
    db.select({ cnt: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending")),
    db.select({ total: sum(withdrawalsTable.amount) }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "approved")),
    db.select({ cnt: count() }).from(completionsTable).where(gte(completionsTable.createdAt, today)),
    db.select({ total: sum(completionsTable.reward) }).from(completionsTable).where(eq(completionsTable.status, "approved")),
  ]);

  res.json(GetAdminDashboardResponse.parse({
    totalUsers: Number(totalUsers[0]?.cnt ?? 0),
    todayNewUsers: Number(todayNewUsers[0]?.cnt ?? 0),
    totalTasks: Number(totalTasks[0]?.cnt ?? 0),
    pendingCompletions: Number(pendingCompletions[0]?.cnt ?? 0),
    pendingWithdrawals: Number(pendingWithdrawals[0]?.cnt ?? 0),
    totalPayout: Number(totalPayoutResult[0]?.total ?? 0),
    todayCompletions: Number(todayCompletions[0]?.cnt ?? 0),
    totalEarned: Number(totalEarnedResult[0]?.total ?? 0),
  }));
});

router.get("/admin/group-summary", requireAdmin, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, todayNewUsers, completedTasks, totalPayoutResult] = await Promise.all([
    db.select({ cnt: count() }).from(usersTable),
    db.select({ cnt: count() }).from(usersTable).where(gte(usersTable.createdAt, today)),
    db.select({ cnt: count() }).from(completionsTable).where(eq(completionsTable.status, "approved")),
    db.select({ total: sum(withdrawalsTable.amount) }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "approved")),
  ]);

  res.json(GetGroupSummaryResponse.parse({
    totalUsers: Number(totalUsers[0]?.cnt ?? 0),
    todayNewUsers: Number(todayNewUsers[0]?.cnt ?? 0),
    completedTasks: Number(completedTasks[0]?.cnt ?? 0),
    totalPayout: Number(totalPayoutResult[0]?.total ?? 0),
    lastUpdated: new Date().toISOString(),
  }));
});

export default router;
