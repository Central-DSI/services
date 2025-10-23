import { describe, it, expect, beforeEach, vi } from "vitest";

// Create the mock object in a hoisted factory so it's available when vi.mock is hoisted
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    thesisStatus: { findMany: vi.fn() },
    thesis: { findMany: vi.fn(), update: vi.fn() },
    thesisGuidance: { findMany: vi.fn() },
  },
}));

vi.mock("../config/prisma.js", () => ({ default: mockPrisma }));

// Import after mocking
import { updateAllThesisStatuses } from "../services/thesisStatus.service.js";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

describe("updateAllThesisStatuses", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma.thesisStatus.findMany.mockReset();
    mockPrisma.thesis.findMany.mockReset();
    mockPrisma.thesis.update.mockReset();
    mockPrisma.thesisGuidance.findMany.mockReset();
  });

  it("categorizes theses into Ongoing/Slow/at_risk based on 30/90-day completions", async () => {
    // Status IDs
    const idOngoing = "ongoing-id";
    const idSlow = "slow-id";
    const idRisk = "risk-id";
    mockPrisma.thesisStatus.findMany.mockResolvedValue([
      { id: idOngoing, name: "Ongoing" },
      { id: idSlow, name: "Slow" },
      { id: idRisk, name: "at_risk" },
    ]);

    // Theses dataset (single page)
    const theses = [
      { id: "A", thesisStatusId: null, startDate: daysAgo(200) }, // 3 in 90d -> Ongoing
      { id: "B", thesisStatusId: null, startDate: daysAgo(200) }, // 2 in 90d incl 1 in 30d -> Ongoing
      { id: "C", thesisStatusId: null, startDate: daysAgo(200) }, // 1 in 90d -> Slow
      { id: "D", thesisStatusId: null, startDate: daysAgo(45) },  // 0 comps, start 45d -> Slow
      { id: "E", thesisStatusId: null, startDate: daysAgo(10) },  // 0 comps, start 10d -> Ongoing
      { id: "F", thesisStatusId: null, startDate: daysAgo(120) }, // 0 comps, start 120d -> at_risk
    ];
    mockPrisma.thesis.findMany
      .mockResolvedValueOnce(theses)
      .mockResolvedValueOnce([]); // end paging

    // Guidance completions per thesis
    const completions = new Map([
      ["A", [daysAgo(10), daysAgo(40), daysAgo(80)]],
      ["B", [daysAgo(10), daysAgo(70)]],
      ["C", [daysAgo(60)]],
      ["D", []],
      ["E", []],
      ["F", []],
    ]);

    // Mock thesisGuidance.findMany to honor 90d and 30d windows
    mockPrisma.thesisGuidance.findMany.mockImplementation(async ({ where }) => {
      const ids = where?.thesisId?.in || [];
      const gte = where?.schedule?.guidanceDate?.gte;
      const out = [];
      for (const id of ids) {
        const arr = completions.get(id) || [];
        for (const dt of arr) {
          if (!gte || dt >= gte) out.push({ thesisId: id });
        }
      }
      return out;
    });

    const summary = await updateAllThesisStatuses({ pageSize: 500, logger: console });

    // Verify update calls mapping to expected statuses
    const updatedCalls = mockPrisma.thesis.update.mock.calls.map((c) => ({ id: c[0].where.id, data: c[0].data }));
    const targetById = new Map(updatedCalls.map((u) => [u.id, u.data.thesisStatusId]));

    expect(targetById.get("A")).toBe(idOngoing);
    expect(targetById.get("B")).toBe(idOngoing);
    expect(targetById.get("C")).toBe(idSlow);
    expect(targetById.get("D")).toBe(idSlow);
    expect(targetById.get("E")).toBe(idOngoing);
    expect(targetById.get("F")).toBe(idRisk);

    // Summary counts
    expect(summary).toEqual({ Ongoing: 3, Slow: 2, at_risk: 1 });
  });
});
