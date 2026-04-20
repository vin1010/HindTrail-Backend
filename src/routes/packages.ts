import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { queryStr, paramStr } from "../utils";
import { getAccessScope } from "../access";

export const packagesRouter = Router();

packagesRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const scope = await getAccessScope(req.userId!);
    const projectId = queryStr(req.query.projectId);
    if (projectId && !scope.projectIds.has(projectId)) {
      res.json([]);
      return;
    }
    const packages = await prisma.workPackage.findMany({
      where: {
        id: { in: [...scope.packageIds] },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(packages);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

packagesRouter.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = paramStr(req.params.id);
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(id)) { res.status(403).json({ error: "Forbidden" }); return; }
    const pkg = await prisma.workPackage.findUnique({ where: { id } });
    if (!pkg) { res.status(404).json({ error: "Not found" }); return; }
    res.json(pkg);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

packagesRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { parentId, projectId } = req.body ?? {};
    const scope = await getAccessScope(req.userId!);
    if (parentId) {
      if (!scope.packageIds.has(parentId)) { res.status(403).json({ error: "Forbidden" }); return; }
    } else if (projectId) {
      if (!scope.isClientOfProject(projectId)) { res.status(403).json({ error: "Only the client company can create root packages" }); return; }
    } else {
      res.status(400).json({ error: "projectId or parentId required" }); return;
    }
    const pkg = await prisma.workPackage.create({ data: req.body });
    res.status(201).json(pkg);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

packagesRouter.patch("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = paramStr(req.params.id);
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(id)) { res.status(403).json({ error: "Forbidden" }); return; }
    const pkg = await prisma.workPackage.update({ where: { id }, data: req.body });
    res.json(pkg);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
