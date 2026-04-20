import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { queryStr, paramStr } from "../utils";
import { getAccessScope } from "../access";

export const documentsRouter = Router();

documentsRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const scope = await getAccessScope(req.userId!);
    const packageId = queryStr(req.query.packageId);
    if (packageId && !scope.packageIds.has(packageId)) { res.json([]); return; }
    const docs = await prisma.document.findMany({
      where: {
        packageId: packageId ?? { in: [...scope.packageIds] },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

documentsRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const packageId = req.body?.packageId;
    if (!packageId) { res.status(400).json({ error: "packageId required" }); return; }
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(packageId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const doc = await prisma.document.create({ data: req.body });
    if (doc.isCurrent) {
      await prisma.document.updateMany({
        where: { packageId: doc.packageId, title: doc.title, id: { not: doc.id } },
        data: { isCurrent: false, status: "Superseded" },
      });
    }
    res.status(201).json(doc);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

documentsRouter.patch("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = paramStr(req.params.id);
    const existing = await prisma.document.findUnique({ where: { id }, select: { packageId: true } });
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(existing.packageId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const doc = await prisma.document.update({ where: { id }, data: req.body });
    res.json(doc);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
