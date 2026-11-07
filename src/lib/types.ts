export type UserRole = "user" | "distributor" | "admin" | "super_admin";

export type UserAccountStatus = "active" | "suspended" | "banned" | "deleted";

export type DistributorApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

export type EcoLevel =
  | "Seedling Explorer"
  | "Green Guardian"
  | "Tree Protector"
  | "Eco Champion"
  | "Forest Hero";

export type CanonicalEcoMilestone =
  | "Initial Plantation"
  | "15-Day Growth Update"
  | "30-Day Growth Update"
  | "60-Day Growth Update"
  | "90-Day Growth Update"
  | "Mature Plant Verification";

export type LegacyEcoMilestone =
  | "Plant Registered"
  | "30 Day Progress"
  | "90 Day Growth"
  | "180 Day Survival"
  | "365 Day Healthy Growth";

export type EcoMilestone = CanonicalEcoMilestone | LegacyEcoMilestone;

export type PlantationStatus = "registered" | "tracking" | "verified" | "completed";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  distributorId?: string;
  accountStatus?: UserAccountStatus;
  mustChangePassword?: boolean;
  sessionVersion?: number;
  distributorApprovalStatus?: DistributorApprovalStatus;
};

export type SessionDatabaseUser = PublicUser & {
  accountStatus: UserAccountStatus;
  mustChangePassword: boolean;
  sessionVersion: number;
};

export type UserRecord = PublicUser & {
  passwordHash: string;
};

export type DistributorProfile = {
  id: string;
  userId?: string | null;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string | null;
  hours: string;
  description: string;
};

export type DistributorSummary = DistributorProfile & {
  plantCount: number;
  availablePlants: number;
  distanceKm?: number;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type DfoOfficeType =
  | "DFO Office"
  | "Forest Division Office"
  | "Nursery"
  | "Sapling Distribution Center";

export type DfoOfficeStatus = "active" | "inactive";

export type DfoOffice = {
  id: string;
  officeName: string;
  district: string;
  division: string;
  mandal: string;
  village: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  officeType: DfoOfficeType;
  verified: boolean;
  saplingDistributionAvailable: boolean;
  status: DfoOfficeStatus;
  availableSaplings: string[];
  operatingHours: string;
  distanceKm?: number;
};

export type DfoOfficeSearch = Partial<Pick<DfoOffice, "district" | "mandal" | "village">> & {
  location?: Coordinates;
  limit?: number;
};

export type DfoOfficeInput = Pick<
  DfoOffice,
  "officeName" | "officeType" | "district" | "address" | "latitude" | "longitude" | "phone" | "verified"
> &
  Partial<
    Pick<
      DfoOffice,
      | "division"
      | "mandal"
      | "village"
      | "email"
      | "saplingDistributionAvailable"
      | "status"
      | "availableSaplings"
      | "operatingHours"
    >
  >;

export type EcoProfileUser = {
  id: string;
  name: string;
  email: string;
};

export type Plantation = {
  id: string;
  userId: string;
  plantName: string;
  imageUrl: string;
  plantationDate: string;
  latitude: number;
  longitude: number;
  status: PlantationStatus;
};

export type ProgressUpload = {
  id: string;
  plantationId: string;
  imageUrl: string;
  uploadedAt: string;
  milestone: Exclude<EcoMilestone, "Initial Plantation" | "Plant Registered">;
  creditsAwarded: number;
  plantName?: string;
};

export type Reward = {
  id: string;
  rewardName: string;
  creditCost: number;
  description: string;
};

export type RewardWithStatus = Reward & {
  redeemed: boolean;
  affordable: boolean;
};

export type Redemption = {
  id: string;
  userId: string;
  rewardId: string;
  redeemedAt: string;
  reward: Reward;
};

export type LevelProgress = {
  currentLevel: EcoLevel;
  nextLevel: EcoLevel | null;
  currentThreshold: number;
  nextThreshold: number | null;
  percent: number;
};

export type EcoProfile = {
  user: EcoProfileUser;
  totalEcoCredits: number;
  availableEcoCredits: number;
  level: EcoLevel;
  levelProgress: LevelProgress;
  treesPlanted: number;
  plantations: Plantation[];
  growthHistory: ProgressUpload[];
  redemptions: Redemption[];
  earnedBadges: string[];
};

export type Plant = {
  id: string;
  distributorId: string;
  commonName: string;
  botanicalName: string;
  category: string;
  quantity: number;
  imageUrl?: string | null;
  updatedAt: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  distributor?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    email?: string;
    hours?: string;
    description?: string;
  };
};

export type CreatePlantInput = {
  distributorId: string;
  commonName: string;
  botanicalName: string;
  category: string;
  quantity: number;
  imageUrl?: string;
};

export type UpdatePlantInput = Partial<Omit<CreatePlantInput, "distributorId">>;

export type UpdateDistributorInput = Partial<
  Pick<DistributorProfile, "name" | "address" | "latitude" | "longitude" | "phone" | "email" | "hours" | "description">
>;

export type CreatePlantationInput = Pick<
  Plantation,
  "plantName" | "imageUrl" | "plantationDate" | "latitude" | "longitude"
> & {
  notes?: string;
};

export type CreateProgressUploadInput = Pick<ProgressUpload, "plantationId" | "imageUrl" | "milestone"> & {
  latitude?: number;
  longitude?: number;
  notes?: string;
};
