import { NextResponse, type NextRequest } from "next/server";
import { listDfoOffices } from "@/lib/repository";
import type { Coordinates } from "@/lib/types";

function parseLocation(searchParams: URLSearchParams): Coordinates | undefined {
  const latitude = searchParams.get("lat");
  const longitude = searchParams.get("lng");

  if (!latitude || !longitude) {
    return undefined;
  }

  return {
    latitude: Number(latitude),
    longitude: Number(longitude)
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = parseLocation(searchParams);
  const limit = Number(searchParams.get("limit") ?? "10");

  if (location && (Number.isNaN(location.latitude) || Number.isNaN(location.longitude))) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: "Limit must be between 1 and 50" }, { status: 400 });
  }

  const offices = await listDfoOffices({
    location,
    limit,
    district: searchParams.get("district") ?? undefined,
    mandal: searchParams.get("mandal") ?? undefined,
    village: searchParams.get("village") ?? undefined
  });

  return NextResponse.json({ offices });
}
