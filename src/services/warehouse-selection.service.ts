// src/services/warehouse-selection.service.ts
//
// Business logic for picking which warehouse fulfills an order.
// Two distinct steps:
//   1. Eligibility which warehouses have all the requested stock. Delegated to the repository.
//   2. Distance ranking of the eligible warehouses, which is closest to the shipping address.
//      Haversine.

import {
  findEligibleWarehouses,
  type OrderItemRequest,
  type EligibleWarehouse,
} from "../repositories/warehouse-inventory.repository.js";
import { NoWarehouseAvailableError } from "../errors/domain-errors.js";

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance between two lat/lng points, in kilometers.
 */
function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export interface SelectedWarehouse {
  warehouseId: string;
  distanceKm: number;
}

/**
 * Finds the nearest warehouse (by shipping address) among all
 * warehouses that have sufficient stock of every requested item.
 */
export async function selectNearestEligibleWarehouse(
  items: OrderItemRequest[],
  shippingLat: number,
  shippingLng: number,
): Promise<SelectedWarehouse> {
  const eligibleWarehouses: EligibleWarehouse[] =
    await findEligibleWarehouses(items);

  if (eligibleWarehouses.length === 0) {
    throw new NoWarehouseAvailableError();
  }

  let nearest: SelectedWarehouse | null = null;

  for (const warehouse of eligibleWarehouses) {
    const distanceKm = haversineDistanceKm(
      shippingLat,
      shippingLng,
      warehouse.lat,
      warehouse.lng,
    );

    if (nearest === null || distanceKm < nearest.distanceKm) {
      nearest = { warehouseId: warehouse.warehouseId, distanceKm };
    }
  }

  return nearest as SelectedWarehouse;
}
