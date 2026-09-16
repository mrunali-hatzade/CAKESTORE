'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  Navigation,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Search,
  Crosshair,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  LocationState,
  LocationDistrict,
  LocationCity,
  LocationLocality,
} from '@/types/location';
import { locationApi } from '@/lib/api/location';

export interface LocationFilterValues {
  mode: 'HIERARCHY' | 'NEARBY';
  state?: string;
  district?: string;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  label: string;
}

export interface AdvancedLocationFilterProps {
  onLocationSelect?: (location: string) => void;
  onFilterChange?: (filters: LocationFilterValues) => void;
  shopCount?: number;
  initialFilters?: Partial<LocationFilterValues>;
  className?: string;
}

const RADIUS_OPTIONS = [5, 10, 20, 50];

export const AdvancedLocationFilter: React.FC<AdvancedLocationFilterProps> = ({
  onLocationSelect,
  onFilterChange,
  shopCount = 0,
  initialFilters = {},
  className = '',
}) => {
  // Discovery Mode
  const [mode, setMode] = useState<'HIERARCHY' | 'NEARBY'>(initialFilters.mode || 'HIERARCHY');

  // Hierarchy selections
  const [state, setState] = useState<string>(initialFilters.state || '');
  const [district, setDistrict] = useState<string>(initialFilters.district || '');
  const [city, setCity] = useState<string>(initialFilters.city || '');
  const [area, setArea] = useState<string>(initialFilters.area || '');
  const [pincode, setPincode] = useState<string>(initialFilters.pincode || '');

  // IDs for foreign key cascading
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  // Dynamic catalog options from Phase 2.3 canonical APIs
  const [states, setStates] = useState<LocationState[]>([]);
  const [districts, setDistricts] = useState<LocationDistrict[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [localities, setLocalities] = useState<LocationLocality[]>([]);
  const [applicablePins, setApplicablePins] = useState<string[]>([]);

  // Loading states
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const [loadingPincodes, setLoadingPincodes] = useState(false);

  // 503 Readiness state
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Geolocation states (Mode B)
  const [geoCoords, setGeoCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialFilters.latitude && initialFilters.longitude
      ? { latitude: initialFilters.latitude, longitude: initialFilters.longitude }
      : null
  );
  const [radiusKm, setRadiusKm] = useState<number>(initialFilters.radiusKm || 10);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Internal update guard to prevent feedback loops
  const isInitialMount = useRef(true);

  // 1. Fetch States on mount
  const loadStates = useCallback(async () => {
    setLoadingStates(true);
    setIsUnavailable(false);
    setServiceError(null);
    try {
      const readiness = await locationApi.getReadiness();
      if (!readiness.ready) {
        setIsUnavailable(true);
        setServiceError('Location service is initializing. Please try again in a moment.');
        setLoadingStates(false);
        return;
      }
      const fetched = await locationApi.getStates('IND');
      setStates(fetched);
    } catch (err: any) {
      if (err?.status === 503 || err?.response?.status === 503) {
        setIsUnavailable(true);
        setServiceError('Location service is temporarily unavailable. Please try again.');
      } else {
        setIsUnavailable(true);
        setServiceError('Unable to connect to location service. Please check your connection.');
      }
    } finally {
      setLoadingStates(false);
    }
  }, []);

  useEffect(() => {
    loadStates();
  }, [loadStates]);

  // 2. Fetch Districts when selectedStateId changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      return;
    }
    let isCancelled = false;
    setLoadingDistricts(true);
    locationApi
      .getDistricts(selectedStateId)
      .then((data) => {
        if (!isCancelled) setDistricts(data);
      })
      .catch((err) => {
        if (!isCancelled && (err?.status === 503 || err?.response?.status === 503)) {
          setIsUnavailable(true);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingDistricts(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedStateId]);

  // 3. Fetch Cities & District Pincodes when selectedDistrictId changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setCities([]);
      setApplicablePins([]);
      return;
    }
    let isCancelled = false;
    setLoadingCities(true);
    Promise.all([
      locationApi.getCities(selectedDistrictId),
      locationApi.getPincodes({ districtId: selectedDistrictId }),
    ])
      .then(([citiesData, pinsData]) => {
        if (!isCancelled) {
          setCities(citiesData);
          setApplicablePins(pinsData);
        }
      })
      .catch((err) => {
        if (!isCancelled && (err?.status === 503 || err?.response?.status === 503)) {
          setIsUnavailable(true);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingCities(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedDistrictId]);

  // 4. Fetch Localities when selectedCityId changes
  useEffect(() => {
    if (!selectedCityId) {
      setLocalities([]);
      return;
    }
    let isCancelled = false;
    setLoadingLocalities(true);
    locationApi
      .getLocalities(selectedCityId)
      .then((data) => {
        if (!isCancelled) setLocalities(data);
      })
      .catch((err) => {
        if (!isCancelled && (err?.status === 503 || err?.response?.status === 503)) {
          setIsUnavailable(true);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingLocalities(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedCityId]);

  // Label calculation
  const getActiveFilterLabel = useCallback(() => {
    if (mode === 'NEARBY' && geoCoords) {
      return `Within ${radiusKm} km of your location`;
    }
    if (pincode) return `PIN ${pincode}`;
    if (area) return area;
    if (city) return city;
    if (district) return district;
    if (state) return state;
    return 'All Locations';
  }, [mode, geoCoords, radiusKm, pincode, area, city, district, state]);

  // Notify parent component on filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const label = getActiveFilterLabel();
    if (onLocationSelect) onLocationSelect(label);

    if (onFilterChange) {
      if (mode === 'NEARBY' && geoCoords) {
        onFilterChange({
          mode: 'NEARBY',
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          radiusKm,
          label,
        });
      } else {
        onFilterChange({
          mode: 'HIERARCHY',
          state: state || undefined,
          district: district || undefined,
          city: city || undefined,
          area: area || undefined,
          pincode: pincode || undefined,
          label,
        });
      }
    }
  }, [mode, state, district, city, area, pincode, geoCoords, radiusKm, getActiveFilterLabel, onLocationSelect, onFilterChange]);

  // Handle State selection
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setState(val);
    const found = states.find((s) => s.name === val || s.code === val);
    setSelectedStateId(found?.id || null);

    // Strict Parent Clearing
    setDistrict('');
    setSelectedDistrictId(null);
    setCity('');
    setSelectedCityId(null);
    setArea('');
    setPincode('');
    setDistricts([]);
    setCities([]);
    setLocalities([]);
    setApplicablePins([]);
  };

  // Handle District selection
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDistrict(val);
    const found = districts.find((d) => d.name === val);
    setSelectedDistrictId(found?.id || null);

    // Strict Parent Clearing
    setCity('');
    setSelectedCityId(null);
    setArea('');
    setPincode('');
    setCities([]);
    setLocalities([]);
  };

  // Handle City selection
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCity(val);
    const found = cities.find((c) => c.name === val);
    setSelectedCityId(found?.id || null);

    // Strict Parent Clearing
    setArea('');
    setPincode('');
    setLocalities([]);
  };

  // Handle Locality / Area selection
  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setArea(val);
    const found = localities.find((l) => l.name === val);

    // If locality selected, fetch PINs for that locality
    if (found && selectedDistrictId) {
      setLoadingPincodes(true);
      locationApi
        .getPincodes({ districtId: selectedDistrictId, localityId: found.id })
        .then((pins) => {
          setApplicablePins(pins);
          if (pins.length === 1 && !pincode) {
            setPincode(pins[0]);
          }
        })
        .finally(() => setLoadingPincodes(false));
    }
  };

  // Handle Pincode selection / input
  const handlePincodeChange = (pin: string) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);

    // Reverse lookup when 6 digits are typed
    if (clean.length === 6) {
      locationApi
        .lookupPincode(clean)
        .then((res) => {
          if (res && res.pincode) {
            if (res.state?.name && !state) {
              setState(res.state.name);
              setSelectedStateId(res.state.id);
            }
            if (res.district?.name && !district) {
              setDistrict(res.district.name);
              setSelectedDistrictId(res.district.id);
            }
            if (res.primaryCity?.name && !city) {
              setCity(res.primaryCity.name);
              setSelectedCityId(res.primaryCity.id);
            }
          }
        })
        .catch(() => {});
    }
  };

  // Genuine Browser Geolocation (Mode B)
  const handleGPS = () => {
    setIsLocating(true);
    setGeoError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsLocating(false);
      setGeoError('Geolocation is not supported by your browser. Please select your location manually.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoCoords({ latitude: lat, longitude: lng });
        setMode('NEARBY');
        setGeoError(null);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to determine your current location. Please select your location manually.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please allow location access in your browser or select your city manually.';
        } else if (err.code === 2) {
          msg = 'Location information is currently unavailable. Please select your city manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again or select your location manually.';
        }
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Reset to All Locations
  const handleReset = () => {
    setMode('HIERARCHY');
    setState('');
    setDistrict('');
    setCity('');
    setArea('');
    setPincode('');
    setSelectedStateId(null);
    setSelectedDistrictId(null);
    setSelectedCityId(null);
    setGeoCoords(null);
    setGeoError(null);
    setRadiusKm(10);
    setDistricts([]);
    setCities([]);
    setLocalities([]);
    setApplicablePins([]);
  };

  return (
    <div className={`w-full bg-white rounded-2xl border border-brand-border/60 shadow-soft p-5 sm:p-6 mb-8 mt-2 max-w-7xl mx-auto ${className}`}>
      {/* 503 Readiness Notification Banner */}
      {isUnavailable && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="font-medium">
              {serviceError || 'Location service is temporarily unavailable. Please try again.'}
            </p>
          </div>
          <button
            type="button"
            onClick={loadStates}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-semibold text-xs transition-colors shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Geolocation Error Alert */}
      {geoError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-2 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{geoError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-bold shrink-0 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center text-brand-plum shrink-0">
            {mode === 'NEARBY' ? <Crosshair className="w-5 h-5 text-brand-plum animate-pulse" /> : <MapPin className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-espresso">
              {mode === 'NEARBY' ? 'Bakeries Near Your Location' : 'Filter Bakeries by Location'}
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">
              {mode === 'NEARBY'
                ? 'Discover artisanal kitchens within your preferred delivery radius'
                : 'Canonical multi-tier location discovery across India'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {mode === 'NEARBY' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('HIERARCHY')}
              className="gap-2 text-xs font-semibold h-9"
            >
              <MapPin className="w-3.5 h-3.5" />
              Switch to Hierarchy
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGPS}
              className="gap-2 text-xs font-semibold h-9 border-brand-plum/30 text-brand-plum hover:bg-brand-blush/60"
              disabled={isLocating}
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Locating...' : 'Use My GPS'}
            </Button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-brand-espresso transition-colors px-2 py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* MODE B: Nearby Radius Mode */}
      {mode === 'NEARBY' && geoCoords ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-brand-blush/40 border border-brand-plum/15 mb-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <p className="text-xs font-bold text-brand-espresso">
                Active GPS Coordinates: {geoCoords.latitude.toFixed(4)}° N, {geoCoords.longitude.toFixed(4)}° E
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-muted">Radius:</span>
              <div className="inline-flex rounded-xl bg-white border border-brand-border/80 p-1 shadow-2xs">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusKm(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      radiusKm === r
                        ? 'bg-brand-plum text-white shadow-xs'
                        : 'text-brand-muted hover:text-brand-espresso'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-brand-muted">
            Distance is calculated automatically by the server using high-precision Haversine spherical geometry. Bakeries closest to you are displayed first.
          </p>
        </div>
      ) : (
        /* MODE A: Canonical Cascading Hierarchy Dropdowns */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
          {/* 1. State / UT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-espresso tracking-wider uppercase">
              1. State / UT {state && '✓'}
            </label>
            <select
              value={state}
              onChange={handleStateChange}
              disabled={loadingStates}
              className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-brand-cream-light/30 text-xs sm:text-sm focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum transition-all cursor-pointer disabled:opacity-60"
            >
              <option value="">{loadingStates ? 'Loading states...' : 'All States / UTs'}</option>
              {states.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. District */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-espresso tracking-wider uppercase">
              2. District {district && '✓'}
            </label>
            <select
              value={district}
              onChange={handleDistrictChange}
              disabled={!state || loadingDistricts}
              className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-brand-cream-light/30 text-xs sm:text-sm focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">
                {loadingDistricts ? 'Loading districts...' : !state ? 'Select State first' : 'All Districts'}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. City / Town */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-espresso tracking-wider uppercase">
              3. City / Town {city && '✓'}
            </label>
            <select
              value={city}
              onChange={handleCityChange}
              disabled={!district || loadingCities}
              className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-brand-cream-light/30 text-xs sm:text-sm focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">
                {loadingCities ? 'Loading cities...' : !district ? 'Select District first' : 'All Cities / Towns'}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Locality / Area / Village */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-espresso tracking-wider uppercase">
              4. Locality / Area {area && '✓'}
            </label>
            <select
              value={area}
              onChange={handleAreaChange}
              disabled={!city || loadingLocalities}
              className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-brand-cream-light/30 text-xs sm:text-sm focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">
                {loadingLocalities ? 'Loading localities...' : !city ? 'Select City first' : 'All Localities / Areas'}
              </option>
              {localities.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Pincode */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-espresso tracking-wider uppercase">
              5. Pincode {pincode && '✓'}
            </label>
            {applicablePins.length > 0 ? (
              <select
                value={pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                disabled={loadingPincodes}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-brand-cream-light/30 text-xs sm:text-sm focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum transition-all cursor-pointer"
              >
                <option value="">All PINs ({applicablePins.length})</option>
                {applicablePins.map((pin) => (
                  <option key={pin} value={pin}>
                    {pin}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 411035"
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-brand-cream-light/30 text-xs sm:text-sm focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum transition-all"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-brand-border/60">
        <p className="text-xs text-brand-muted">
          Showing <span className="font-bold text-brand-espresso">{shopCount}</span> bakeries in{' '}
          <span className="font-semibold text-brand-plum">{getActiveFilterLabel()}</span>
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-brand-muted">Active Scope:</span>
          <span className="font-medium bg-brand-cream px-2.5 py-0.5 rounded-full text-brand-espresso border border-brand-border/50">
            {getActiveFilterLabel()}
          </span>
        </div>
      </div>
    </div>
  );
};
