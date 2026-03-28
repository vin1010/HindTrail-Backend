import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";
import { queryStr } from "../utils";

export const activityRouter = Router();

activityRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const packageId = queryStr(req.query.packageId);
    const where = packageId ? { packageId } : {};
    const items = await prisma.activity.findMany({ where, orderBy: { timestamp: "desc" }, take: 50 });
    res.json(items);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

activityRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.activity.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
