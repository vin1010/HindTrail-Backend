import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { getAccessScope } from "../access";

export const commentsRouter = Router();

commentsRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const packageId = req.query.packageId as string;
    const scope = await getAccessScope(req.userId!);
    if (packageId && !scope.packageIds.has(packageId)) { res.json([]); return; }
    const data = await prisma.comment.findMany({
      where: { packageId: packageId ?? { in: [...scope.packageIds] } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { fullName: true } } },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

commentsRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { packageId, text } = req.body;
    if (!packageId) { res.status(400).json({ error: "packageId required" }); return; }
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(packageId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const created = await prisma.comment.create({
      data: { packageId, text, userId: req.userId! },
      include: { user: { select: { fullName: true } } },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
