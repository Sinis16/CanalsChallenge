// src/integrations/geocoding/geocoding-service.interface.ts
//
// Contract for any geocoding implementation

export interface GeocodeInput {
  address: string;
  city: string;
  country: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
}

export interface GeocodingService {
  /**
   * Resolves a postal address into coordinates
   * Throws:
   *  - MissingFieldsError if address, city, or country is empty/missing
   *  - InvalidAddressError if the address cannot be resolved
   *  - GeocodingTimeoutError if the provider fails to respond (simulated)
   */
  geocode(input: GeocodeInput): Promise<GeocodeResult>;
}
