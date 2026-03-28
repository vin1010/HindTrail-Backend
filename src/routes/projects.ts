import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";

export const projectsRouter = Router();

// GET /projects
projectsRouter.get("/", authMiddleware, async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /projects/:id
projectsRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /projects
projectsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, code, clientName, location, startDate, endDate, description } = req.body;
    const project = await prisma.project.create({
      data: { name, code, clientName: clientName || "", location: location || "", startDate: startDate || "", endDate: endDate || "", description: description || "" },
    });
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// PATCH /projects/:id
projectsRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
