import { getPool, hasDatabaseUrl } from "./db";
import { addDistanceToOffice, rankDfoOfficesByDistance, rankDistributorsByDistance } from "./discovery";
import type {
  Coordinates,
  CreatePlantInput,
  CreateUserInput,
  DfoOffice,
  DfoOfficeInput,
  DfoOfficeSearch,
  DistributorProfile,
  DistributorSummary,
  Plant,
  PublicUser,
  SessionDatabaseUser,
  UpdateDistributorInput,
  UpdatePlantInput,
  UserRecord
} from "./types";

function normalizeAccountStatus(value: unknown) {
  return value === "suspended" || value === "banned" || value === "deleted" ? value : "active";
}

function normalizeDistributorApprovalStatus(value: unknown) {
  if (value === "pending" || value === "rejected" || value === "suspended") {
    return value;
  }

  return value === "approved" ? "approved" : undefined;
}

function normalizePlant(row: Record<string, unknown>): Plant {
  return {
    id: String(row.id),
    distributorId: String(row.distributor_id),
    commonName: String(row.common_name),
    botanicalName: String(row.botanical_name),
    category: String(row.category),
    quantity: Number(row.quantity),
    imageUrl: row.image_url ? String(row.image_url) : null,
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function normalizeDistributor(row: Record<string, unknown>): DistributorSummary {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    name: String(row.name),
    address: String(row.address),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    phone: String(row.phone),
    email: row.email ? String(row.email) : null,
    hours: String(row.hours),
    description: String(row.description),
    plantCount: Number(row.plant_count ?? 0),
    availablePlants: Number(row.available_plants ?? 0)
  };
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }

  return Boolean(value);
}

function normalizeDfoOffice(row: Record<string, unknown>): DfoOffice {
  const officeStatus = String(
    row.office_status ?? (normalizeBoolean(row.verified) ? "verified" : row.status === "inactive" ? "inactive" : "pending")
  );

  return {
    id: String(row.id),
    officeName: String(row.office_name),
    district: String(row.district),
    division: String(row.division),
    mandal: String(row.mandal ?? ""),
    village: String(row.village ?? ""),
    address: String(row.full_address ?? row.address),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    phone: String(row.phone),
    email: row.email ? String(row.email) : "",
    officeType: row.office_type as DfoOffice["officeType"],
    verified: officeStatus === "verified",
    saplingDistributionAvailable: normalizeBoolean(row.sapling_distribution_available),
    status: officeStatus === "inactive" || officeStatus === "closed" ? "inactive" : "active",
    availableSaplings: Array.isArray(row.available_saplings)
      ? row.available_saplings.map(String)
      : String(row.available_saplings ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    operatingHours: String(row.working_hours ?? row.operating_hours ?? "Mon-Sat, 10:00 AM-5:00 PM")
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      SELECT users.id,
             users.name,
             users.email,
             users.password_hash,
             users.role,
             COALESCE(users.account_status, 'active') AS account_status,
             COALESCE(users.must_change_password, false) AS must_change_password,
             COALESCE(users.session_version, 0)::int AS session_version,
             distributors.approval_status AS distributor_approval_status,
             distributors.id AS distributor_id
      FROM users
      LEFT JOIN distributors ON distributors.user_id = users.id
      WHERE users.email = $1
      LIMIT 1
    `,
    [email.toLowerCase()]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    distributorId: row.distributor_id ?? undefined,
    accountStatus: normalizeAccountStatus(row.account_status),
    mustChangePassword: normalizeBoolean(row.must_change_password),
    sessionVersion: Number(row.session_version ?? 0),
    distributorApprovalStatus: normalizeDistributorApprovalStatus(row.distributor_approval_status)
  };
}

export async function findSessionUserById(id: string): Promise<SessionDatabaseUser | null> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      SELECT users.id,
             users.name,
             users.email,
             users.role,
             COALESCE(users.account_status, 'active') AS account_status,
             COALESCE(users.must_change_password, false) AS must_change_password,
             COALESCE(users.session_version, 0)::int AS session_version,
             distributors.id AS distributor_id,
             distributors.approval_status AS distributor_approval_status
      FROM users
      LEFT JOIN distributors ON distributors.user_id = users.id
      WHERE users.id = $1
      LIMIT 1
    `,
    [id]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    distributorId: row.distributor_id ?? undefined,
    accountStatus: normalizeAccountStatus(row.account_status),
    mustChangePassword: normalizeBoolean(row.must_change_password),
    sessionVersion: Number(row.session_version ?? 0),
    distributorApprovalStatus: normalizeDistributorApprovalStatus(row.distributor_approval_status)
  };
}

export async function findUserCredentialsById(id: string): Promise<Pick<UserRecord, "id" | "passwordHash"> | null> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    passwordHash: row.password_hash
  };
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<SessionDatabaseUser> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      UPDATE users
      SET password_hash = $2,
          must_change_password = false,
          password_changed_at = now(),
          session_version = COALESCE(session_version, 0) + 1,
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [id, passwordHash]
  );

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  const user = await findSessionUserById(id);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const createdUser = await client.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role
      `,
      [input.name, input.email.toLowerCase(), input.passwordHash, input.role]
    );

    const user = createdUser.rows[0];
    let distributorId: string | undefined;

    if (input.role === "distributor" && input.distributor) {
      const createdDistributor = await client.query(
        `
          INSERT INTO distributors (user_id, name, address, latitude, longitude, phone, email, hours, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `,
        [
          user.id,
          input.distributor.name,
          input.distributor.address,
          input.distributor.latitude,
          input.distributor.longitude,
          input.distributor.phone,
          input.distributor.email ?? input.email,
          input.distributor.hours ?? "Mon-Fri, 9:00 AM-5:00 PM",
          input.distributor.description ?? "Government nursery distributor"
        ]
      );

      distributorId = createdDistributor.rows[0].id;
    }

    await client.query("COMMIT");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      distributorId
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof Error && error.message.includes("duplicate")) {
      throw new Error("An account with this email already exists");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function listDistributors(location?: Coordinates): Promise<DistributorSummary[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const result = await getPool().query(
    `
      SELECT distributors.*,
             COUNT(plants.id)::int AS plant_count,
             COALESCE(SUM(plants.quantity), 0)::int AS available_plants
      FROM distributors
      LEFT JOIN plants ON plants.distributor_id = distributors.id
      GROUP BY distributors.id
      ORDER BY distributors.name ASC
    `
  );

  return rankDistributorsByDistance(result.rows.map(normalizeDistributor), location);
}

export async function listDfoOffices(search: DfoOfficeSearch = {}): Promise<DfoOffice[]> {
  const limit = search.limit ?? 10;

  if (!hasDatabaseUrl()) {
    return [];
  }

  const result = await getPool().query(
    `
      SELECT *
      FROM dfo_offices
      WHERE office_status = 'verified'
        AND deleted_at IS NULL
        AND ($1::text IS NULL OR district ILIKE '%' || $1 || '%')
        AND ($2::text IS NULL OR mandal ILIKE '%' || $2 || '%')
        AND ($3::text IS NULL OR village ILIKE '%' || $3 || '%')
      ORDER BY district ASC, office_name ASC
    `,
    [
      search.district?.trim() || null,
      search.mandal?.trim() || null,
      search.village?.trim() || null
    ]
  );

  return rankDfoOfficesByDistance(result.rows.map(normalizeDfoOffice), search.location, limit);
}

export async function getDfoOfficeById(id: string, location?: Coordinates): Promise<DfoOffice | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const result = await getPool().query(
    "SELECT * FROM dfo_offices WHERE id = $1 AND office_status = 'verified' AND deleted_at IS NULL LIMIT 1",
    [id]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return addDistanceToOffice(normalizeDfoOffice(row), location);
}

export async function listAdminDfoOffices(): Promise<DfoOffice[]> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      SELECT *
      FROM dfo_offices
      WHERE deleted_at IS NULL
      ORDER BY office_status ASC, district ASC, office_name ASC
    `
  );

  return result.rows.map(normalizeDfoOffice);
}

function dfoInputValues(input: DfoOfficeInput) {
  const officeStatus = input.status === "inactive" ? "inactive" : input.verified ? "verified" : "pending";

  return [
    input.officeName,
    input.officeType,
    input.district,
    input.division ?? "",
    input.mandal ?? "",
    input.village ?? "",
    input.address,
    input.latitude,
    input.longitude,
    input.phone,
    input.email ?? "",
    input.verified,
    input.saplingDistributionAvailable ?? true,
    input.status ?? "active",
    input.availableSaplings ?? [],
    input.operatingHours ?? "",
    officeStatus
  ];
}

export async function createDfoOffice(input: DfoOfficeInput): Promise<DfoOffice> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      INSERT INTO dfo_offices (
        office_name,
        office_type,
        district,
        division,
        mandal,
        village,
        address,
        full_address,
        latitude,
        longitude,
        phone,
        email,
        verified,
        sapling_distribution_available,
        status,
        available_saplings,
        operating_hours,
        working_hours,
        office_status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $7,
        $8,
        $9,
        $10,
        NULLIF($11, ''),
        $12,
        $13,
        $14,
        $15,
        COALESCE(NULLIF($16, ''), 'Mon-Sat, 10:00 AM-5:00 PM'),
        COALESCE(NULLIF($16, ''), 'Mon-Sat, 10:00 AM-5:00 PM'),
        $17
      )
      RETURNING *
    `,
    dfoInputValues(input)
  );

  return normalizeDfoOffice(result.rows[0]);
}

export async function updateDfoOffice(id: string, input: Partial<DfoOfficeInput>): Promise<DfoOffice | null> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const currentResult = await getPool().query("SELECT * FROM dfo_offices WHERE id = $1 LIMIT 1", [id]);
  const current = currentResult.rows[0] ? normalizeDfoOffice(currentResult.rows[0]) : null;

  if (!current) {
    return null;
  }

  const next: DfoOfficeInput = {
    officeName: input.officeName ?? current.officeName,
    officeType: input.officeType ?? current.officeType,
    district: input.district ?? current.district,
    division: input.division ?? current.division,
    mandal: input.mandal ?? current.mandal,
    village: input.village ?? current.village,
    address: input.address ?? current.address,
    latitude: input.latitude ?? current.latitude,
    longitude: input.longitude ?? current.longitude,
    phone: input.phone ?? current.phone,
    email: input.email ?? current.email,
    verified: input.verified ?? current.verified,
    saplingDistributionAvailable: input.saplingDistributionAvailable ?? current.saplingDistributionAvailable,
    status: input.status ?? current.status,
    availableSaplings: input.availableSaplings ?? current.availableSaplings,
    operatingHours: input.operatingHours ?? current.operatingHours
  };

  const result = await getPool().query(
    `
      UPDATE dfo_offices
      SET office_name = $2,
          office_type = $3,
          district = $4,
          division = $5,
          mandal = $6,
          village = $7,
          address = $8,
          full_address = $8,
          latitude = $9,
          longitude = $10,
          phone = $11,
          email = NULLIF($12, ''),
          verified = $13,
          sapling_distribution_available = $14,
          status = $15,
          available_saplings = $16,
          operating_hours = COALESCE(NULLIF($17, ''), 'Mon-Sat, 10:00 AM-5:00 PM'),
          working_hours = COALESCE(NULLIF($17, ''), 'Mon-Sat, 10:00 AM-5:00 PM'),
          office_status = $18,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [id, ...dfoInputValues(next)]
  );

  return normalizeDfoOffice(result.rows[0]);
}

export async function deleteDfoOffice(id: string): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      UPDATE dfo_offices
      SET office_status = 'closed',
          status = 'inactive',
          verified = false,
          deleted_at = now(),
          updated_at = now()
      WHERE id = $1
    `,
    [id]
  );

  return Number(result.rowCount ?? 0) > 0;
}

export async function listPlants(distributorId?: string): Promise<Plant[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const result = await getPool().query(
    `
      SELECT *
      FROM plants
      WHERE ($1::uuid IS NULL OR distributor_id = $1::uuid)
      ORDER BY common_name ASC
    `,
    [distributorId ?? null]
  );

  return result.rows.map(normalizePlant);
}

export async function createPlant(input: CreatePlantInput): Promise<Plant> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query(
    `
      INSERT INTO plants (distributor_id, common_name, botanical_name, category, quantity, image_url)
      VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
      RETURNING *
    `,
    [input.distributorId, input.commonName, input.botanicalName, input.category, input.quantity, input.imageUrl ?? ""]
  );

  return normalizePlant(result.rows[0]);
}

export async function updatePlant(plantId: string, distributorId: string, input: UpdatePlantInput): Promise<Plant | null> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const current = await getPool().query("SELECT * FROM plants WHERE id = $1 AND distributor_id = $2", [
    plantId,
    distributorId
  ]);

  if (!current.rows[0]) {
    return null;
  }

  const existing = normalizePlant(current.rows[0]);
  const result = await getPool().query(
    `
      UPDATE plants
      SET common_name = $3,
          botanical_name = $4,
          category = $5,
          quantity = $6,
          image_url = NULLIF($7, ''),
          updated_at = now()
      WHERE id = $1 AND distributor_id = $2
      RETURNING *
    `,
    [
      plantId,
      distributorId,
      input.commonName ?? existing.commonName,
      input.botanicalName ?? existing.botanicalName,
      input.category ?? existing.category,
      input.quantity ?? existing.quantity,
      input.imageUrl ?? existing.imageUrl ?? ""
    ]
  );

  return normalizePlant(result.rows[0]);
}

export async function getDistributorProfile(distributorId: string): Promise<DistributorProfile | null> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await getPool().query("SELECT * FROM distributors WHERE id = $1", [distributorId]);
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return normalizeDistributor({
    ...row,
    plant_count: 0,
    available_plants: 0
  });
}

export async function updateDistributorProfile(distributorId: string, input: UpdateDistributorInput) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const current = await getDistributorProfile(distributorId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...input
  };

  const result = await getPool().query(
    `
      UPDATE distributors
      SET name = $2,
          address = $3,
          latitude = $4,
          longitude = $5,
          phone = $6,
          email = NULLIF($7, ''),
          hours = $8,
          description = $9,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [
      distributorId,
      next.name,
      next.address,
      next.latitude,
      next.longitude,
      next.phone,
      next.email ?? "",
      next.hours,
      next.description
    ]
  );

  return normalizeDistributor({
    ...result.rows[0],
    plant_count: 0,
    available_plants: 0
  });
}
