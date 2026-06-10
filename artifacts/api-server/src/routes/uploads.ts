import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { UploadScreenshotBody, UploadScreenshotResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post("/uploads/screenshot", requireAuth, async (req, res): Promise<void> => {
  const parsed = UploadScreenshotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: base64Data, filename } = parsed.data;

  try {
    const ext = (filename || "screenshot.jpg").split(".").pop() || "jpg";
    const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const fpath = path.join(uploadsDir, fname);

    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(fpath, buffer);

    const url = `/api/uploads/${fname}`;
    res.json(UploadScreenshotResponse.parse({ url }));
  } catch (err) {
    req.log.error({ err }, "Failed to save screenshot");
    res.status(500).json({ error: "Failed to save file" });
  }
});

// Serve uploaded files
router.get("/uploads/:filename", (req, res): void => {
  const filename = req.params.filename;
  if (!filename || filename.includes("..")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const fpath = path.join(uploadsDir, filename);
  if (!fs.existsSync(fpath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(fpath);
});

export default router;
