import { prisma } from "./db";

/**
 * Auto-advances a work package status based on its approvals and issues.
 *
 * Rules:
 *  - If all approvals are Approved AND no open issues → "Ready for Handover"
 *  - If any approval is Pending → "Awaiting Approval"
 *  - Otherwise leave status unchanged (manual control)
 *
 * Only updates if the computed status differs from the current status, and
 * only moves "forward" — won't overwrite a manually-set "Closed".
 */
export async function syncPackageStatus(packageId: string): Promise<void> {
  const [approvals, openIssues, pkg] = await Promise.all([
    prisma.approval.findMany({ where: { packageId } }),
    prisma.issue.findMany({ where: { packageId, status: { not: "Closed" } } }),
    prisma.workPackage.findUnique({ where: { id: packageId }, select: { status: true } }),
  ]);

  if (!pkg || pkg.status === "Closed") return;

  const hasApprovals = approvals.length > 0;
  const allApproved = hasApprovals && approvals.every((a) => a.decision === "Approved");
  const hasPending = approvals.some((a) => a.decision === "Pending");
  const noOpenIssues = openIssues.length === 0;

  let newStatus: string | null = null;

  if (allApproved && noOpenIssues) {
    newStatus = "Ready for Handover";
  } else if (hasPending) {
    newStatus = "Awaiting Approval";
  }

  if (newStatus && newStatus !== pkg.status) {
    await prisma.workPackage.update({
      where: { id: packageId },
      data: { status: newStatus },
    });
  }
}
