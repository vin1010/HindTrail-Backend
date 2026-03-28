import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";
import { queryStr, paramStr } from "../utils";

export const packagesRouter = Router();

packagesRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const projectId = queryStr(req.query.projectId);
    const where = projectId ? { projectId } : {};
    const packages = await prisma.workPackage.findMany({ where, orderBy: { createdAt: "asc" } });
    res.json(packages);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

packagesRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const pkg = await prisma.workPackage.findUnique({ where: { id: paramStr(req.params.id) } });
    if (!pkg) { res.status(404).json({ error: "Not found" }); return; }
    res.json(pkg);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

packagesRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const pkg = await prisma.workPackage.create({ data: req.body });
    res.status(201).json(pkg);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

packagesRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const pkg = await prisma.workPackage.update({ where: { id: paramStr(req.params.id) }, data: req.body });
    res.json(pkg);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
