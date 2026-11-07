import type { Coordinates, DfoOffice, DistributorSummary } from "./types";

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
) {
  if (fromLatitude === toLatitude && fromLongitude === toLongitude) {
    return 0;
  }

  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatRad = toRadians(fromLatitude);
  const toLatRad = toRadians(toLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(longitudeDelta / 2) ** 2;

  const distance = 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Number(distance.toFixed(2));
}

export function rankDistributorsByDistance(distributors: DistributorSummary[], location?: Coordinates) {
  if (!location) {
    return [...distributors].sort((a, b) => b.availablePlants - a.availablePlants);
  }

  return distributors
    .map((distributor) => ({
      ...distributor,
      distanceKm: calculateDistanceKm(
        location.latitude,
        location.longitude,
        distributor.latitude,
        distributor.longitude
      )
    }))
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) {
        return (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
      }

      return b.availablePlants - a.availablePlants;
    });
}

export function addDistanceToOffice(office: DfoOffice, location?: Coordinates): DfoOffice {
  if (!location) {
    return office;
  }

  return {
    ...office,
    distanceKm: calculateDistanceKm(location.latitude, location.longitude, office.latitude, office.longitude)
  };
}

export function rankDfoOfficesByDistance(offices: DfoOffice[], location?: Coordinates, limit = 10) {
  const ranked = offices
    .filter((office) => office.status === "active" && office.verified)
    .map((office) => addDistanceToOffice(office, location))
    .sort((a, b) => {
      if (a.distanceKm !== undefined && b.distanceKm !== undefined && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }

      if (a.saplingDistributionAvailable !== b.saplingDistributionAvailable) {
        return a.saplingDistributionAvailable ? -1 : 1;
      }

      return a.district.localeCompare(b.district) || a.officeName.localeCompare(b.officeName);
    });

  return ranked.slice(0, limit);
}
