import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";

export const inspectionsRouter = Router();

inspectionsRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { packageId } = req.query;
    const where = packageId ? { packageId: packageId as string } : {};
    const items = await prisma.inspection.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

inspectionsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.inspection.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

inspectionsRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.inspection.update({ where: { id: req.params.id }, data: req.body });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
