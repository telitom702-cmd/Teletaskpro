import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";
import {
  GetMeResponse, UpdateMeBody, UpdateMeResponse,
  ListUsersQueryParams, ListUsersResponse,
  GetUserByIdParams, GetUserByIdResponse,
  BanUserParams, BanUserResponse,
  UnbanUserParams, UnbanUserResponse,
  AdjustUserBalanceParams, AdjustUserBalanceBody, AdjustUserBalanceResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(user: any) {
  return {
    ...user,
    balance: Number(user.balance),
    totalEarned: Number(user.totalEarned),
    totalWithdrawn: Number(user.totalWithdrawn),
  };
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetMeResponse.parse(formatUser(user)));
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.user!.userId))
    .returning();
  res.json(UpdateMeResponse.parse(formatUser(user)));
});

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const params = ListUsersQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const search = params.success ? params.data.search : undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(usersTable);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(usersTable);

  if (search) {
    const condition = or(
      ilike(usersTable.firstName, `%${search}%`),
      ilike(usersTable.username, `%${search}%`),
      eq(usersTable.telegramId, search)
    );
    query = query.where(condition) as typeof query;
    countQuery = countQuery.where(condition) as typeof countQuery;
  }

  const [users, countResult] = await Promise.all([
    query.limit(limit).offset(offset).orderBy(usersTable.createdAt),
    countQuery,
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  res.json(ListUsersResponse.parse({ users: users.map(formatUser), total, page, limit }));
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const p = GetUserByIdParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.data.id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(GetUserByIdResponse.parse(formatUser(user)));
});

router.patch("/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const p = BanUserParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const [user] = await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, p.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(BanUserResponse.parse(formatUser(user)));
});

router.patch("/users/:id/unban", requireAdmin, async (req, res): Promise<void> => {
  const p = UnbanUserParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const [user] = await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, p.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(UnbanUserResponse.parse(formatUser(user)));
});

router.patch("/users/:id/balance", requireAdmin, async (req, res): Promise<void> => {
  const p = AdjustUserBalanceParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const b = AdjustUserBalanceBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: b.error.message }); return; }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, p.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const newBalance = Math.max(0, Number(existing.balance) + b.data.amount);
  const newTotalEarned = b.data.amount > 0
    ? Number(existing.totalEarned) + b.data.amount
    : Number(existing.totalEarned);

  const [user] = await db
    .update(usersTable)
    .set({ balance: String(newBalance), totalEarned: String(newTotalEarned) })
    .where(eq(usersTable.id, p.data.id))
    .returning();
  res.json(AdjustUserBalanceResponse.parse(formatUser(user)));
});

export default router;
