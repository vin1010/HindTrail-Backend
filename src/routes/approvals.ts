import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";

export const approvalsRouter = Router();

approvalsRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { packageId } = req.query;
    const where = packageId ? { packageId: packageId as string } : {};
    const items = await prisma.approval.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

approvalsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.approval.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

approvalsRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.approval.update({ where: { id: req.params.id }, data: req.body });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
