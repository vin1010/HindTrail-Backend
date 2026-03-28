import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";

export const membersRouter = Router();

membersRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { packageId } = req.query;
    const where = packageId ? { packageId: packageId as string } : {};
    const items = await prisma.packageMember.findMany({ where });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

membersRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.packageMember.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

membersRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.packageMember.update({ where: { id: req.params.id }, data: req.body });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

membersRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await prisma.packageMember.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
