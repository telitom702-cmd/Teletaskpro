import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import tasksRouter from "./tasks";
import completionsRouter from "./completions";
import withdrawalsRouter from "./withdrawals";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(tasksRouter);
router.use(completionsRouter);
router.use(withdrawalsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(uploadsRouter);

export default router;
