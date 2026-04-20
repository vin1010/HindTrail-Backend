import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { queryStr } from "../utils";
import { getAccessScope } from "../access";

export const activityRouter = Router();

activityRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const scope = await getAccessScope(req.userId!);
    const packageId = queryStr(req.query.packageId);
    if (packageId && !scope.packageIds.has(packageId)) { res.json([]); return; }
    const items = await prisma.activity.findMany({
      where: { packageId: packageId ?? { in: [...scope.packageIds] } },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    res.json(items);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

activityRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const packageId = req.body?.packageId;
    if (packageId) {
      const scope = await getAccessScope(req.userId!);
      if (!scope.packageIds.has(packageId)) { res.status(403).json({ error: "Forbidden" }); return; }
    }
    const item = await prisma.activity.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
