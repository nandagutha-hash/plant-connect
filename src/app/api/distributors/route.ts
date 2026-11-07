import { NextResponse, type NextRequest } from "next/server";
import { listDistributors } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get("lat");
  const longitude = searchParams.get("lng");
  const location =
    latitude && longitude
      ? {
          latitude: Number(latitude),
          longitude: Number(longitude)
        }
      : undefined;

  if (location && (Number.isNaN(location.latitude) || Number.isNaN(location.longitude))) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const distributors = await listDistributors(location);
  return NextResponse.json({ distributors });
}
