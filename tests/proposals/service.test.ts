import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProposalService } from "@/lib/proposals/service";
import type { ItemInput } from "@/lib/proposals/validation";
import { type TestDb, createTestDb, seedScenario } from "../helpers/test-db";

const BASE_URL = "http://localhost:3000";

const dinner: ItemInput = {
  category: "DINING",
  title: "Private chef dinner",
  description: "Five courses on the terrace",
  scheduledAt: "2027-03-16T19:00",
  priceCents: 120_000,
};
const surf: ItemInput = {
  category: "ACTIVITIES",
  title: "Surf lesson",
  description: "",
  scheduledAt: "2027-03-16T08:00",
  priceCents: 25_000,
};

let db: TestDb;
let cleanup: () => Promise<void>;
let service: ReturnType<typeof createProposalService>;
let reservationId: number;

beforeEach(async () => {
  ({ db, cleanup } = createTestDb());
  service = createProposalService(db);
  reservationId = (await seedScenario(db)).id;
  vi.spyOn(console, "log").mockImplementation(() => {}); // keep the simulated email out of test output
});

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanup();
});

const createDraft = (items: ItemInput[] = [dinner, surf]) =>
  service.createProposal({ reservationId, note: null, items });

describe("createProposal", () => {
  it("creates a draft with items sorted by time and a computed total", async () => {
    const proposal = await createDraft();

    expect(proposal.status).toBe("draft");
    expect(proposal.id).toMatch(/^[\w-]{21}$/); // nanoid public id, not the numeric PK
    expect(proposal.items.map((item) => item.title)).toEqual(["Surf lesson", "Private chef dinner"]);
    expect(proposal.totalCents).toBe(145_000);
    expect(proposal.member.name).toBe("James Whitfield");
  });

  it("attributes the proposal to the current concierge", async () => {
    const proposal = await createDraft();

    expect(proposal.concierge).toEqual({
      name: "Sofia Navarro",
      title: "Senior Concierge, Punta Mita",
      email: "sofia.navarro@example.com",
      phone: "+52 329 555 0142",
    });
  });

  it("fails loudly when the configured concierge doesn't exist (unseeded database)", async () => {
    await db.concierge.deleteMany();

    await expect(createDraft()).rejects.toThrow('No concierge with email "sofia.navarro@example.com"');
  });

  it("attributes to the configured concierge, not whichever row comes first", async () => {
    await db.concierge.deleteMany();
    const other = { name: "Marco Ruiz", title: "Concierge", phone: "+52 329 555 0100" };
    await db.concierge.create({ data: { ...other, email: "marco.ruiz@example.com" } });
    await db.concierge.create({
      data: { ...other, name: "Sofia Navarro", email: "sofia.navarro@example.com" },
    });

    expect((await createDraft()).concierge.name).toBe("Sofia Navarro");
  });

  it("rejects items outside the stay with RULE_VIOLATION", async () => {
    const lateCheckout = { ...dinner, scheduledAt: "2027-03-23T10:00" };

    await expect(createDraft([surf, lateCheckout])).rejects.toMatchObject({
      code: "RULE_VIOLATION",
      details: { items: [{ index: 1, scheduledAt: "2027-03-23T10:00" }] },
    });
  });

  it("returns NOT_FOUND for an unknown reservation", async () => {
    await expect(
      service.createProposal({ reservationId: 999, note: null, items: [] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("sendProposal", () => {
  it("marks the proposal sent and records the email in one step", async () => {
    const draft = await createDraft();

    const { proposal, email } = await service.sendProposal(draft.id, { baseUrl: BASE_URL });

    expect(proposal.status).toBe("sent");
    expect(proposal.sentAt).not.toBeNull();
    expect(email.toEmail).toBe("james.whitfield@example.com");
    expect(email.bodyPreview).toContain(`${BASE_URL}/proposal/${draft.id}`);
    expect(email.bodyPreview).toContain("$1,450.00");
    expect(email.bodyPreview).toContain("Sofia Navarro\nSenior Concierge, Punta Mita");
    expect(await db.sentEmail.count()).toBe(1);
  });

  it("refuses to send an empty draft and writes no email", async () => {
    const draft = await createDraft([]);

    await expect(service.sendProposal(draft.id, { baseUrl: BASE_URL })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect((await service.getProposal(draft.id)).status).toBe("draft");
    expect(await db.sentEmail.count()).toBe(0);
  });

  it("refuses to send twice", async () => {
    const draft = await createDraft();
    await service.sendProposal(draft.id, { baseUrl: BASE_URL });

    await expect(service.sendProposal(draft.id, { baseUrl: BASE_URL })).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    expect(await db.sentEmail.count()).toBe(1);
  });
});

describe("changeStatus", () => {
  it("walks the full loop draft → sent → approved → paid with timestamps", async () => {
    const draft = await createDraft();

    const sent = await service.changeStatus(draft.id, "sent", { baseUrl: BASE_URL });
    const approved = await service.changeStatus(draft.id, "approved", { baseUrl: BASE_URL });
    const paid = await service.changeStatus(draft.id, "paid", { baseUrl: BASE_URL });

    expect([sent.status, approved.status, paid.status]).toEqual(["sent", "approved", "paid"]);
    expect(paid.sentAt && paid.approvedAt && paid.paidAt).toBeTruthy();
    expect(await db.sentEmail.count()).toBe(1); // PATCH → sent goes through the same send path
  });

  it.each([
    ["draft", "approved"],
    ["draft", "paid"],
    ["draft", "draft"],
  ] as const)("rejects %s → %s with INVALID_TRANSITION", async (_from, to) => {
    const draft = await createDraft();

    await expect(service.changeStatus(draft.id, to, { baseUrl: BASE_URL })).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("lets only one of two concurrent approvals succeed", async () => {
    const draft = await createDraft();
    await service.sendProposal(draft.id, { baseUrl: BASE_URL });

    const results = await Promise.allSettled([
      service.changeStatus(draft.id, "approved", { baseUrl: BASE_URL }),
      service.changeStatus(draft.id, "approved", { baseUrl: BASE_URL }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    });
  });

  it("returns NOT_FOUND for an unknown proposal", async () => {
    await expect(
      service.changeStatus("does-not-exist", "approved", { baseUrl: BASE_URL }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("bumps updated_at on every status change and draft edit", async () => {
    const draft = await createDraft();
    const updatedAt = async () =>
      (await db.proposal.findUniqueOrThrow({ where: { publicId: draft.id } })).updatedAt.getTime();

    const created = await updatedAt();
    vi.useFakeTimers({ toFake: ["Date"], now: created + 60_000 });
    await service.updateDraft(draft.id, { note: "Edited" });
    const edited = await updatedAt();
    vi.setSystemTime(edited + 60_000);
    await service.sendProposal(draft.id, { baseUrl: BASE_URL });
    const sent = await updatedAt();
    vi.useRealTimers();

    expect(edited).toBeGreaterThan(created);
    expect(sent).toBeGreaterThan(edited);
  });
});

describe("updateDraft", () => {
  it("replaces items and note while the proposal is a draft", async () => {
    const draft = await createDraft();

    const updated = await service.updateDraft(draft.id, { note: "Welcome back!", items: [surf] });

    expect(updated.note).toBe("Welcome back!");
    expect(updated.items.map((item) => item.title)).toEqual(["Surf lesson"]);
    expect(updated.totalCents).toBe(25_000);
  });

  it("keeps items when only the note changes", async () => {
    const draft = await createDraft();

    const updated = await service.updateDraft(draft.id, { note: "See you soon" });

    expect(updated.items).toHaveLength(2);
  });

  it("refuses edits once the proposal has been sent", async () => {
    const draft = await createDraft();
    await service.sendProposal(draft.id, { baseUrl: BASE_URL });

    await expect(service.updateDraft(draft.id, { items: [surf] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect((await service.getProposal(draft.id)).items).toHaveLength(2);
  });
});

describe("listProposals", () => {
  it("summarises each proposal with item count and total", async () => {
    const draft = await createDraft();

    const { proposals } = await service.listProposals();

    expect(proposals).toEqual([
      expect.objectContaining({
        id: draft.id,
        conciergeName: "Sofia Navarro",
        status: "draft",
        itemCount: 2,
        totalCents: 145_000,
      }),
    ]);
  });
});
