import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { getAccessScope } from "../access";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const commentsRouter = Router();

commentsRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const packageId = req.query.packageId as string;
    const scope = await getAccessScope(req.userId!);
    if (packageId && !scope.packageIds.has(packageId)) { res.json([]); return; }
    const data = await prisma.comment.findMany({
      where: { packageId: packageId ?? { in: [...scope.packageIds] } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

commentsRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { packageId, text, mentions = [] } = req.body ?? {};
    if (!packageId) { res.status(400).json({ error: "packageId required" }); return; }
    const scope = await getAccessScope(req.userId!);
    if (!scope.packageIds.has(packageId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const cleanMentions: string[] = Array.isArray(mentions)
      ? mentions.filter((m: unknown) => typeof m === "string").slice(0, 20)
      : [];

    const created = await prisma.comment.create({
      data: { packageId, text, userId: req.userId!, mentions: cleanMentions },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    res.status(201).json(created);

    // Fire-and-forget: email each mentioned user. Never blocks the response.
    if (resend && cleanMentions.length) {
      void (async () => {
        try {
          const pkg = await prisma.workPackage.findUnique({
            where: { id: packageId },
            include: { project: true },
          });
          const appUrl = process.env.APP_URL ?? "https://jobtrail-frontend.vercel.app";
          const author = created.user.fullName;
          await Promise.all(cleanMentions.map((email) =>
            resend!.emails.send({
              from: "HindTrail <noreply@hindtrail.com>",
              to: email,
              subject: `${author} mentioned you on ${pkg?.name ?? "a package"}`,
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                  <h2 style="color:#4f46e5;margin:0 0 8px">HindTrail · Mention</h2>
                  <p><strong>${author}</strong> mentioned you on <strong>${pkg?.name ?? ""}</strong>${pkg?.project ? ` (${pkg.project.name})` : ""}:</p>
                  <blockquote style="border-left:3px solid #4f46e5;padding:8px 12px;background:#f3f4f6;margin:12px 0;font-size:14px">
                    ${text.replace(/</g, "&lt;")}
                  </blockquote>
                  <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open discussion</a>
                </div>
              `,
            }).catch((e: unknown) => console.error("Mention email failed:", e))
          ));
        } catch (e) {
          console.error("Mention email batch failed:", e);
        }
      })();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
