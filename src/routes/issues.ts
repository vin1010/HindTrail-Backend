import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { queryStr, paramStr } from "../utils";
import { syncPackageStatus } from "../syncStatus";
import { getAccessScope } from "../access";

export const issuesRouter = Router();

issuesRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const scope = await getAccessScope(req.userId!);
    const packageId = queryStr(req.query.packageId);
    if (packageId && !scope.packageIds.has(packageId)) { res.json([]); return; }
    const items = await prisma.issue.findMany({
      where: { packageId: packageId ?? { in: [...scope.packageIds] } },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

issuesRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const packageId = req.body?.packageId;
    if (!packageId) { res.status(400).json({ error: "packageId required" }); return; }
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(packageId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const item = await prisma.issue.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

issuesRouter.patch("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = paramStr(req.params.id);
    const existing = await prisma.issue.findUnique({ where: { id }, select: { packageId: true } });
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(existing.packageId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const item = await prisma.issue.update({ where: { id }, data: req.body });
    await syncPackageStatus(item.packageId);
    res.json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
