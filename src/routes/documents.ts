import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";

export const documentsRouter = Router();

// GET /documents?packageId=xxx
documentsRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { packageId } = req.query;
    const where = packageId ? { packageId: packageId as string } : {};
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /documents
documentsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const doc = await prisma.document.create({ data: req.body });

    // Auto-supersede previous revisions of same title
    if (doc.isCurrent) {
      await prisma.document.updateMany({
        where: {
          packageId: doc.packageId,
          title: doc.title,
          id: { not: doc.id },
        },
        data: { isCurrent: false, status: "Superseded" },
      });
    }

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// PATCH /documents/:id
documentsRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await prisma.document.update({ where: { id: req.params.id }, data: req.body });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
