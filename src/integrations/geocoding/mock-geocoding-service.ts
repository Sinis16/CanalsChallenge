// src/integrations/geocoding/mock-geocoding-service.ts
//
// Deterministic mock.
//
// Behavior:
//   1. Missing address/city/country -> throw MissingFieldsError
//   2. address === "timeout" -> throw GeocodingTimeoutError (deterministic timeout test)
//   3. City not in the known lookup table -> throw InvalidAddressError (simulates "we couldn't resolve this location")
//   4. Known city -> return city base coordinates, offset by a small jitter derived from address string.

import type {
  GeocodingService,
  GeocodeInput,
  GeocodeResult,
} from "./geocoding-service.interface.js";
import {
  MissingFieldsError,
  InvalidAddressError,
  GeocodingTimeoutError,
} from "../../errors/domain-errors.js";

const TIMEOUT_TRIGGER = "timeout";

// ~0.05 degrees is roughly 5km — enough to differentiate addresses
const MAX_JITTER = 0.05;

/**
 * Simple deterministic string hash (djb2). Not cryptographic — just
 * needs to spread different strings to different numbers consistently.
 */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0; // force unsigned 32-bit
}

/**
 * Derives a deterministic offset in [-MAX_JITTER, MAX_JITTER] from a
 * string, using a given "salt" so lat and lng get different (but
 * deterministic) offsets from the same address.
 */
function jitterFromString(value: string, salt: string): number {
  const hash = hashString(value + salt);
  const normalized = (hash % 10000) / 10000; // 0..1
  return (normalized * 2 - 1) * MAX_JITTER; // -MAX_JITTER..MAX_JITTER
}

// Matches the cities used in the seed script (src/db/seed.ts)
const KNOWN_CITIES: Record<string, GeocodeResult> = {
  bogota: { lat: 4.711, lng: -74.0721 },
  medellin: { lat: 6.2442, lng: -75.5812 },
  cali: { lat: 3.4516, lng: -76.532 },
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export class MockGeocodingService implements GeocodingService {
  async geocode({
    address,
    city,
    country,
  }: GeocodeInput): Promise<GeocodeResult> {
    if (!address?.trim() || !city?.trim() || !country?.trim()) {
      throw new MissingFieldsError();
    }

    if (normalize(address) === TIMEOUT_TRIGGER) {
      throw new GeocodingTimeoutError();
    }

    const normalizedCity = normalize(city);
    const base = KNOWN_CITIES[normalizedCity];

    if (!base) {
      throw new InvalidAddressError(
        `Could not resolve address in city: ${city}`,
      );
    }

    return {
      lat: base.lat + jitterFromString(address, "lat"),
      lng: base.lng + jitterFromString(address, "lng"),
    };
  }
}
