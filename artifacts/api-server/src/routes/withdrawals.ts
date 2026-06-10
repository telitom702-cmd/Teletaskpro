import { Router, type IRouter } from "express";
import { db, withdrawalsTable, usersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import {
  ListAllWithdrawalsQueryParams, ListAllWithdrawalsResponse,
  RequestWithdrawalBody,
  ListMyWithdrawalsResponse,
  ApproveWithdrawalParams, ApproveWithdrawalResponse,
  RejectWithdrawalParams, RejectWithdrawalBody, RejectWithdrawalResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram";

const router: IRouter = Router();

function formatWithdrawal(w: any, user?: any) {
  return {
    ...w,
    amount: Number(w.amount),
    user: user ? { ...user, balance: Number(user.balance), totalEarned: Number(user.totalEarned), totalWithdrawn: Number(user.totalWithdrawn) } : undefined,
  };
}

router.post("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const b = RequestWithdrawalBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: b.error.message }); return; }

  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (Number(user.balance) < b.data.amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // Deduct balance immediately (hold)
  await db.update(usersTable).set({
    balance: String(Number(user.balance) - b.data.amount),
  }).where(eq(usersTable.id, userId));

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    userId,
    amount: String(b.data.amount),
    method: b.data.method,
    accountNumber: b.data.accountNumber,
    status: "pending",
  }).returning();

  res.status(201).json(formatWithdrawal(withdrawal));
});

router.get("/withdrawals/mine", requireAuth, async (req, res): Promise<void> => {
  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, req.user!.userId))
    .orderBy(desc(withdrawalsTable.createdAt));
  res.json(ListMyWithdrawalsResponse.parse(withdrawals.map(w => formatWithdrawal(w))));
});

router.get("/withdrawals", requireAdmin, async (req, res): Promise<void> => {
  const params = ListAllWithdrawalsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const status = params.success ? params.data.status : undefined;
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = db
    .select({ withdrawal: withdrawalsTable, user: usersTable })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id));

  if (status) {
    query = query.where(eq(withdrawalsTable.status, status)) as typeof query;
  }

  const rows = await query.orderBy(desc(withdrawalsTable.createdAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(withdrawalsTable);

  const withdrawals = rows.map(({ withdrawal, user }) => formatWithdrawal(withdrawal, user));
  res.json(ListAllWithdrawalsResponse.parse({ withdrawals, total: Number(total), page }));
});

router.patch("/withdrawals/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const p = ApproveWithdrawalParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

  const [existing] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, p.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Withdrawal not found" }); return; }
  if (existing.status !== "pending") {
    res.status(400).json({ error: "Withdrawal already processed" }); return;
  }

  const [withdrawal] = await db
    .update(withdrawalsTable).set({ status: "approved" })
    .where(eq(withdrawalsTable.id, p.data.id)).returning();

  // Update user totalWithdrawn
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
  if (user) {
    await db.update(usersTable).set({
      totalWithdrawn: String(Number(user.totalWithdrawn) + Number(existing.amount)),
    }).where(eq(usersTable.id, existing.userId));
    sendTelegramMessage(user.telegramId, `Withdrawal of $${Number(existing.amount).toFixed(2)} approved!`);
  }

  res.json(ApproveWithdrawalResponse.parse(formatWithdrawal(withdrawal)));
});

router.patch("/withdrawals/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const p = RejectWithdrawalParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const b = RejectWithdrawalBody.safeParse(req.body);

  const [existing] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, p.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Withdrawal not found" }); return; }

  const [withdrawal] = await db
    .update(withdrawalsTable)
    .set({ status: "rejected", rejectionReason: b.success ? (b.data.reason || null) : null })
    .where(eq(withdrawalsTable.id, p.data.id)).returning();

  // Refund balance
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
  if (user) {
    await db.update(usersTable).set({
      balance: String(Number(user.balance) + Number(existing.amount)),
    }).where(eq(usersTable.id, existing.userId));
    const reason = b.success ? b.data.reason : undefined;
    sendTelegramMessage(user.telegramId, `Withdrawal rejected. Amount refunded.${reason ? ` Reason: ${reason}` : ""}`);
  }

  res.json(RejectWithdrawalResponse.parse(formatWithdrawal(withdrawal)));
});

export default router;
