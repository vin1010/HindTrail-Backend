import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";

export const packagesRouter = Router();

// GET /packages?projectId=xxx
packagesRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId: projectId as string } : {};
    const packages = await prisma.workPackage.findMany({ where, orderBy: { createdAt: "asc" } });
    res.json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /packages/:id
packagesRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const pkg = await prisma.workPackage.findUnique({ where: { id: req.params.id } });
    if (!pkg) { res.status(404).json({ error: "Not found" }); return; }
    res.json(pkg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /packages
packagesRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const pkg = await prisma.workPackage.create({ data: req.body });
    res.status(201).json(pkg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// PATCH /packages/:id
packagesRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const pkg = await prisma.workPackage.update({ where: { id: req.params.id }, data: req.body });
    res.json(pkg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
