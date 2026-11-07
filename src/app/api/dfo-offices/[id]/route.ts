import { NextResponse, type NextRequest } from "next/server";
import { getDfoOfficeById } from "@/lib/repository";
import type { Coordinates } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const location = parseLocation(searchParams);

  if (location && (Number.isNaN(location.latitude) || Number.isNaN(location.longitude))) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const office = await getDfoOfficeById(id, location);

  if (!office) {
    return NextResponse.json({ error: "Office not found" }, { status: 404 });
  }

  return NextResponse.json({ office });
}
