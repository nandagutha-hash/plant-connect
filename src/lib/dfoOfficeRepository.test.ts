import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  hasDatabaseUrl: () => true,
  getPool: () => ({
    query: queryMock
  })
}));

async function loadRepository() {
  vi.resetModules();
  return import("./repository");
}

const officeRow = {
  id: "office-1",
  office_name: "Verified Forest Office",
  office_type: "DFO Office",
  district: "NTR",
  division: "NTR Forest Division",
  mandal: "",
  village: "Vijayawada",
  address: "Forest Department Road, Vijayawada",
  latitude: 16.5062,
  longitude: 80.648,
  phone: "+91 866 000 0000",
  email: "office@example.gov",
  sapling_distribution_available: true,
  status: "active",
  verified: true,
  available_saplings: [],
  operating_hours: "Mon-Sat, 10:00 AM-5:00 PM",
  office_status: "verified",
  full_address: "Forest Department Road, Vijayawada",
  working_hours: "Mon-Sat, 10:00 AM-5:00 PM"
};

describe("DFO office repository", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("only queries verified offices for public discovery", async () => {
    queryMock.mockResolvedValueOnce({ rows: [officeRow] });
    const { listDfoOffices } = await loadRepository();

    const offices = await listDfoOffices({
      district: "NTR",
      village: "Vijayawada",
      limit: 10
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]).toContain("office_status = 'verified'");
    expect(queryMock.mock.calls[0]?.[1]).toEqual(["NTR", null, "Vijayawada"]);
    expect(offices[0]).toMatchObject({
      id: "office-1",
      officeName: "Verified Forest Office",
      verified: true
    });
  });

  it("keeps unverified offices available to admin management", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          ...officeRow,
          id: "office-2",
          office_name: "Pending Forest Office",
          verified: false,
          office_status: "pending"
        }
      ]
    });
    const { listAdminDfoOffices } = await loadRepository();

    const offices = await listAdminDfoOffices();

    expect(queryMock.mock.calls[0]?.[0]).not.toContain("verified = true");
    expect(offices[0]).toMatchObject({
      id: "office-2",
      officeName: "Pending Forest Office",
      verified: false
    });
  });
});
