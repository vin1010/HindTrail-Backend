import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";

export const issuesRouter = Router();

issuesRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { packageId } = req.query;
    const where = packageId ? { packageId: packageId as string } : {};
    const items = await prisma.issue.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

issuesRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.issue.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

issuesRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.issue.update({ where: { id: req.params.id }, data: req.body });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
