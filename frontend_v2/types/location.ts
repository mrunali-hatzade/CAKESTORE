export interface LocationCountry {
  id: number;
  code: string;
  name: string;
  phoneCode?: string;
}

export interface LocationState {
  id: number;
  countryId: number;
  code: string;
  name: string;
  type: string;
  lgdCode?: number;
}

export interface LocationDistrict {
  id: number;
  stateId: number;
  stateName?: string;
  name: string;
  lgdCode?: number;
}

export interface LocationCity {
  id: number;
  districtId: number;
  districtName?: string;
  name: string;
  tier?: string;
  lgdUlbCode?: number;
}

export interface LocationLocality {
  id: number;
  cityId: number;
  cityName?: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface PincodeLookupResponse {
  pincode: string;
  state: LocationState;
  district: LocationDistrict;
  primaryCity?: LocationCity | null;
  primaryOfficeName?: string;
  officeType?: string;
  deliveryStatus?: string;
  applicableLocalities: LocationLocality[];
}

export interface LocationValidationPayload {
  state: string;
  district?: string;
  city?: string;
  area?: string;
  pincode?: string;
}

export interface LocationReadiness {
  ready: boolean;
  status: string;
  version: string;
  statesCount?: number;
  districtsCount?: number;
  citiesCount?: number;
  pincodesCount?: number;
}

export interface CascadingLocationValues {
  country?: string;
  state: string;
  district: string;
  city: string;
  area: string;
  pincode: string;
}
