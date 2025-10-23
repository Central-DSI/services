import prisma from "../config/prisma.js";

const DAYS_30 = 30;
const DAYS_90 = 90;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function decideStatus({ completions30, completions90, thesisStart }) {
  const d30 = daysAgo(DAYS_30);
  const d90 = daysAgo(DAYS_90);

  // Grace rules for no completions yet
  if (!completions90 || completions90 === 0) {
    if (thesisStart instanceof Date) {
      if (thesisStart > d30) return "Ongoing"; // brand new
      if (thesisStart > d90) return "Slow";    // some time but not too long
    }
    return "at_risk";
  }

  // Frequency-based categorization
  if (completions90 >= 3) return "Ongoing";
  if (completions30 >= 1 && completions90 >= 2) return "Ongoing";
  // 1–2 in 90 days → Slow
  return "Slow";
}

export async function updateAllThesisStatuses({ pageSize = 200, logger = console } = {}) {
  // Resolve ThesisStatus ids
  const statuses = await prisma.thesisStatus.findMany({ select: { id: true, name: true } });
  const map = new Map(statuses.map((s) => [String(s.name || "").toLowerCase(), s.id]));
  const idOngoing = map.get("ongoing");
  const idSlow = map.get("slow");
  const idAtRisk = map.get("at_risk") || map.get("at-risk");

  if (!idOngoing || !idSlow || !idAtRisk) {
    throw new Error("Missing ThesisStatus rows: require 'Ongoing', 'Slow', 'at_risk'");
  }

  const since30 = daysAgo(DAYS_30);
  const since90 = daysAgo(DAYS_90);

  let page = 0;
  const updated = { Ongoing: 0, Slow: 0, at_risk: 0 };

  for (;;) {
    const theses = await prisma.thesis.findMany({
      skip: page * pageSize,
      take: pageSize,
      select: { id: true, thesisStatusId: true, startDate: true },
      orderBy: { id: "asc" },
    });
    if (theses.length === 0) break;

    const thesisIds = theses.map((t) => t.id);

    // Completed guidances in last 90 days (by schedule.guidanceDate)
    const completed90 = await prisma.thesisGuidance.findMany({
      where: {
        thesisId: { in: thesisIds },
        status: "completed",
        schedule: { guidanceDate: { gte: since90 } },
      },
      select: { thesisId: true },
    });

    // Completed guidances in last 30 days
    const completed30 = await prisma.thesisGuidance.findMany({
      where: {
        thesisId: { in: thesisIds },
        status: "completed",
        schedule: { guidanceDate: { gte: since30 } },
      },
      select: { thesisId: true },
    });

    const counts90 = new Map();
    for (const r of completed90) counts90.set(r.thesisId, (counts90.get(r.thesisId) || 0) + 1);
    const counts30 = new Map();
    for (const r of completed30) counts30.set(r.thesisId, (counts30.get(r.thesisId) || 0) + 1);

    await Promise.all(
      theses.map(async (t) => {
        const c90 = counts90.get(t.id) || 0;
        const c30 = counts30.get(t.id) || 0;
        const target = decideStatus({ completions30: c30, completions90: c90, thesisStart: t.startDate });
        const targetId = target === "Ongoing" ? idOngoing : target === "Slow" ? idSlow : idAtRisk;
        if (targetId !== t.thesisStatusId) {
          await prisma.thesis.update({ where: { id: t.id }, data: { thesisStatusId: targetId } });
          updated[target] += 1;
        }
      })
    );

    page += 1;
  }

  logger.log(
    `[thesis-status] Updated: ongoing=${updated.Ongoing}, slow=${updated.Slow}, at_risk=${updated.at_risk}`
  );
  return updated;
}
