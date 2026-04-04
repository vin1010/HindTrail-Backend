import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";
import { queryStr, paramStr } from "../utils";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const membersRouter = Router();

membersRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const packageId = queryStr(req.query.packageId);
    const where = packageId ? { packageId } : {};
    const items = await prisma.packageMember.findMany({ where });
    res.json(items);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

membersRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.packageMember.create({ data: req.body });

    // Send invite email if Resend is configured
    if (resend && item.email) {
      const pkg = await prisma.workPackage.findUnique({
        where: { id: item.packageId },
        include: { project: true },
      });
      const appUrl = process.env.APP_URL ?? "https://jobtrail-frontend.vercel.app";
      await resend.emails.send({
        from: "HindTrail <noreply@hindtrail.com>",
        to: item.email,
        subject: `You've been added to ${pkg?.name ?? "a work package"} on HindTrail`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#4f46e5">HindTrail Invite</h2>
            <p>Hi ${item.name},</p>
            <p>You've been added as <strong>${item.role}</strong> on:</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
              <strong>${pkg?.name ?? item.packageId}</strong><br/>
              <span style="color:#6b7280;font-size:14px">${pkg?.project?.name ?? ""} · ${pkg?.project?.location ?? ""}</span>
            </div>
            <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open HindTrail</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">HindTrail · Project execution across contractors</p>
          </div>
        `,
      }).catch((e: unknown) => console.error("Email send failed:", e));
    }

    res.status(201).json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

membersRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.packageMember.update({ where: { id: paramStr(req.params.id) }, data: req.body });
    res.json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

membersRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await prisma.packageMember.delete({ where: { id: paramStr(req.params.id) } });
    res.json({ deleted: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
