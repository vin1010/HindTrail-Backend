import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { projectsRouter } from "./routes/projects";
import { packagesRouter } from "./routes/packages";
import { documentsRouter } from "./routes/documents";
import { inspectionsRouter } from "./routes/inspections";
import { issuesRouter } from "./routes/issues";
import { approvalsRouter } from "./routes/approvals";
import { activityRouter } from "./routes/activity";
import { membersRouter } from "./routes/members";
import { workspaceRouter } from "./routes/workspace";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "HindTrail API" });
});

// Routes
app.use("/auth", authRouter);
app.use("/workspace", workspaceRouter);
app.use("/projects", projectsRouter);
app.use("/packages", packagesRouter);
app.use("/documents", documentsRouter);
app.use("/inspections", inspectionsRouter);
app.use("/issues", issuesRouter);
app.use("/approvals", approvalsRouter);
app.use("/activity", activityRouter);
app.use("/members", membersRouter);

app.listen(PORT, () => {
  console.log(`HindTrail API running on port ${PORT}`);
});
