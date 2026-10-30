import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createReservationService } from "@/lib/reservations/service";
import { type TestDb, createTestDb, seedStay } from "../helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;

beforeEach(() => {
  ({ db, cleanup } = createTestDb());
});

afterEach(() => cleanup());

describe("listReservations", () => {
  it("returns each reservation with its member, without internal member ids", async () => {
    const reservation = await seedStay(db);

    const { reservations } = await createReservationService(db).listReservations();

    expect(reservations).toEqual([
      {
        reservation: {
          id: reservation.id,
          destination: "Punta Mita, Mexico",
          villa: "Villa Punta Mita",
          timeZone: "America/Bahia_Banderas",
          arrivalDate: "2027-03-15",
          departureDate: "2027-03-22",
        },
        member: { name: "James Whitfield", email: "james.whitfield@example.com" },
      },
    ]);
  });

  it("returns an empty list when there are no reservations", async () => {
    expect(await createReservationService(db).listReservations()).toEqual({ reservations: [] });
  });
});
