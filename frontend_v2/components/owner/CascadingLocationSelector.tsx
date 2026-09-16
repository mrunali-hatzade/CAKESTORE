'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  LocationCountry,
  LocationState,
  LocationDistrict,
  LocationCity,
  LocationLocality,
  CascadingLocationValues,
} from '@/types/location';
import { locationApi } from '@/lib/api/location';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { AlertCircle, RefreshCw, MapPin, Search } from 'lucide-react';

interface CascadingLocationSelectorProps {
  values: CascadingLocationValues;
  onChange: (updated: Partial<CascadingLocationValues>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

export default function CascadingLocationSelector({
  values,
  onChange,
  fieldErrors = {},
  disabled = false,
}: CascadingLocationSelectorProps) {
  // Catalog entities
  const [states, setStates] = useState<LocationState[]>([]);
  const [districts, setDistricts] = useState<LocationDistrict[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [localities, setLocalities] = useState<LocationLocality[]>([]);
  const [applicablePins, setApplicablePins] = useState<string[]>([]);

  // Selected entities (for foreign key cascading)
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedLocalityId, setSelectedLocalityId] = useState<number | null>(null);

  // Loading states
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const [lookingUpPin, setLookingUpPin] = useState(false);

  // Availability / 503 Readiness state
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Avoid circular feedback when resolving initial or reverse-lookup values
  const isInternalUpdate = useRef(false);

  // 1. Fetch States on mount
  const loadStates = useCallback(async () => {
    setLoadingStates(true);
    setIsUnavailable(false);
    setServiceError(null);

    try {
      const stateList = await locationApi.getStates('IND');
      setStates(stateList);

      // If initial state name exists, match its ID
      if (values.state) {
        const matched = stateList.find(
          (s) => s.name.trim().toLowerCase() === values.state.trim().toLowerCase()
        );
        if (matched) {
          setSelectedStateId(matched.id);
        }
      }
    } catch (err: any) {
      if (err?.status === 503 || err?.message?.toLowerCase().includes('initializing') || err?.message?.toLowerCase().includes('unavailable')) {
        setIsUnavailable(true);
        setServiceError('Location service is temporarily unavailable. Please try again.');
      } else {
        setServiceError(err?.message || 'Failed to load location catalog');
      }
    } finally {
      setLoadingStates(false);
    }
  }, [values.state]);

  useEffect(() => {
    loadStates();
  }, [loadStates]);

  // 2. Fetch Districts when selectedStateId changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      return;
    }

    let active = true;
    setLoadingDistricts(true);

    locationApi
      .getDistricts(selectedStateId)
      .then((distList) => {
        if (!active) return;
        setDistricts(distList);

        // If existing district matches
        if (values.district) {
          const matched = distList.find(
            (d) => d.name.trim().toLowerCase() === values.district.trim().toLowerCase()
          );
          if (matched) {
            setSelectedDistrictId(matched.id);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err?.status === 503) {
          setIsUnavailable(true);
          setServiceError('Location service is temporarily unavailable. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });

    return () => {
      active = false;
    };
  }, [selectedStateId, values.district]);

  // 3. Fetch Cities when selectedDistrictId changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setCities([]);
      return;
    }

    let active = true;
    setLoadingCities(true);

    locationApi
      .getCities(selectedDistrictId)
      .then((cityList) => {
        if (!active) return;
        setCities(cityList);

        // If existing city matches
        if (values.city) {
          const matched = cityList.find(
            (c) => c.name.trim().toLowerCase() === values.city.trim().toLowerCase()
          );
          if (matched) {
            setSelectedCityId(matched.id);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err?.status === 503) {
          setIsUnavailable(true);
          setServiceError('Location service is temporarily unavailable. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    // Also fetch district-level PINs as fallback list
    locationApi
      .getPincodes({ districtId: selectedDistrictId })
      .then((pins) => {
        if (!active) return;
        setApplicablePins(pins);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedDistrictId, values.city]);

  // 4. Fetch Localities when selectedCityId changes
  useEffect(() => {
    if (!selectedCityId) {
      setLocalities([]);
      return;
    }

    let active = true;
    setLoadingLocalities(true);

    locationApi
      .getLocalities(selectedCityId)
      .then((locList) => {
        if (!active) return;
        setLocalities(locList);

        // If existing area matches
        if (values.area) {
          const matched = locList.find(
            (l) => l.name.trim().toLowerCase() === values.area.trim().toLowerCase()
          );
          if (matched) {
            setSelectedLocalityId(matched.id);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err?.status === 503) {
          setIsUnavailable(true);
          setServiceError('Location service is temporarily unavailable. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoadingLocalities(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCityId, values.area]);

  // 5. Fetch locality-specific PINs when selectedLocalityId changes
  useEffect(() => {
    if (!selectedLocalityId) return;

    let active = true;
    locationApi
      .getPincodes({ localityId: selectedLocalityId })
      .then((pins) => {
        if (!active) return;
        if (pins && pins.length > 0) {
          setApplicablePins(pins);
          // If current pincode is empty or not in the mapped list, auto-select primary pin
          if (!values.pincode || !pins.includes(values.pincode)) {
            onChange({ pincode: pins[0] });
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedLocalityId, values.pincode, onChange]);

  // Handle State selection
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stateName = e.target.value;
    if (!stateName) {
      setSelectedStateId(null);
      setSelectedDistrictId(null);
      setSelectedCityId(null);
      setSelectedLocalityId(null);
      setDistricts([]);
      setCities([]);
      setLocalities([]);
      setApplicablePins([]);
      onChange({ state: '', district: '', city: '', area: '', pincode: '' });
      return;
    }

    const stateObj = states.find((s) => s.name === stateName);
    setSelectedStateId(stateObj ? stateObj.id : null);
    // Clear all child selections per Step 3: State changes -> clear District, City, Locality, Pincode
    setSelectedDistrictId(null);
    setSelectedCityId(null);
    setSelectedLocalityId(null);
    setCities([]);
    setLocalities([]);
    setApplicablePins([]);
    onChange({
      state: stateName,
      district: '',
      city: '',
      area: '',
      pincode: '',
    });
  };

  // Handle District selection
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const distName = e.target.value;
    if (!distName) {
      setSelectedDistrictId(null);
      setSelectedCityId(null);
      setSelectedLocalityId(null);
      setCities([]);
      setLocalities([]);
      setApplicablePins([]);
      onChange({ district: '', city: '', area: '', pincode: '' });
      return;
    }

    const distObj = districts.find((d) => d.name === distName);
    setSelectedDistrictId(distObj ? distObj.id : null);
    // Clear all child selections per Step 3: District changes -> clear City, Locality, Pincode
    setSelectedCityId(null);
    setSelectedLocalityId(null);
    setLocalities([]);
    onChange({
      district: distName,
      city: '',
      area: '',
      pincode: '',
    });
  };

  // Handle City selection
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value;
    if (!cityName) {
      setSelectedCityId(null);
      setSelectedLocalityId(null);
      setLocalities([]);
      onChange({ city: '', area: '', pincode: '' });
      return;
    }

    const cityObj = cities.find((c) => c.name === cityName);
    setSelectedCityId(cityObj ? cityObj.id : null);
    // Clear all child selections per Step 3: City changes -> clear Locality, Pincode
    setSelectedLocalityId(null);
    onChange({
      city: cityName,
      area: '',
      pincode: '',
    });
  };

  // Handle Locality selection
  const handleLocalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const areaName = e.target.value;
    if (!areaName) {
      setSelectedLocalityId(null);
      onChange({ area: '', pincode: '' });
      return;
    }

    const locObj = localities.find((l) => l.name === areaName);
    setSelectedLocalityId(locObj ? locObj.id : null);
    // Step 3: Locality changes -> clear incompatible Pincode
    onChange({ area: areaName, pincode: '' });
  };

  // Handle Reverse Pincode Lookup when 6 digits are entered
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.trim();
    onChange({ pincode: pin });

    if (pin.length === 6 && /^[1-9][0-9]{5}$/.test(pin)) {
      setLookingUpPin(true);
      locationApi
        .lookupPincode(pin)
        .then((res) => {
          if (!res) return;

          // Auto-fill state if not set or mismatched
          const updates: Partial<CascadingLocationValues> = { pincode: pin };

          if (res.state && res.state.name) {
            updates.state = res.state.name;
            const stateObj = states.find((s) => s.name === res.state.name);
            if (stateObj) setSelectedStateId(stateObj.id);
          }

          if (res.district && res.district.name) {
            updates.district = res.district.name;
            const distObj = districts.find((d) => d.name === res.district.name);
            if (distObj) setSelectedDistrictId(distObj.id);
          }

          if (res.primaryCity && res.primaryCity.name) {
            updates.city = res.primaryCity.name;
            const cityObj = cities.find((c) => c.name === res.primaryCity!.name);
            if (cityObj) setSelectedCityId(cityObj.id);
          }

          onChange(updates);
        })
        .catch(() => {
          // If lookup fails or PIN is not in active seed, let validation handle it on submit
        })
        .finally(() => {
          setLookingUpPin(false);
        });
    }
  };

  return (
    <div className="space-y-4">
      {/* 503 Readiness / Service Unavailable Alert Banner */}
      {isUnavailable && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-soft">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-serif font-bold text-sm text-amber-950">
                Location Service Unavailable
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                {serviceError || 'Location service is temporarily unavailable. Please try again.'}
              </p>
              <button
                type="button"
                onClick={loadStates}
                disabled={loadingStates}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStates ? 'animate-spin' : ''}`} />
                <span>Retry Location Catalog</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Country & State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-brand-espresso mb-1.5">
            Country <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="w-full px-3.5 py-2.5 bg-neutral-50 rounded-xl border border-brand-border text-brand-espresso text-sm flex items-center justify-between">
            <span className="font-medium">India (+91)</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted bg-neutral-200/60 px-2 py-0.5 rounded">
              Canonical
            </span>
          </div>
        </div>

        <div>
          <Select
            label="State / Union Territory"
            required
            disabled={disabled || isUnavailable || loadingStates}
            value={values.state || ''}
            onChange={handleStateChange}
            error={fieldErrors.state}
            helperText={loadingStates ? 'Loading states...' : undefined}
            options={[
              { value: '', label: loadingStates ? 'Loading States...' : '-- Select State / UT --' },
              ...states.map((s) => ({
                value: s.name,
                label: `${s.name}${s.code ? ` (${s.code})` : ''}`,
              })),
            ]}
          />
        </div>
      </div>

      {/* Row 2: District & City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Select
            label="District"
            required
            disabled={disabled || !selectedStateId || loadingDistricts}
            value={values.district || ''}
            onChange={handleDistrictChange}
            error={fieldErrors.district}
            helperText={
              !selectedStateId
                ? 'Select a State first'
                : loadingDistricts
                ? 'Loading districts...'
                : districts.length === 0
                ? '(No districts listed)'
                : undefined
            }
            options={[
              {
                value: '',
                label: !selectedStateId
                  ? '-- Select State First --'
                  : loadingDistricts
                  ? 'Loading Districts...'
                  : '-- Select District --',
              },
              ...districts.map((d) => ({
                value: d.name,
                label: d.name,
              })),
            ]}
          />
        </div>

        <div>
          <Select
            label="City / Town / Municipality"
            required
            disabled={disabled || !selectedDistrictId || loadingCities}
            value={values.city || ''}
            onChange={handleCityChange}
            error={fieldErrors.city}
            helperText={
              !selectedDistrictId
                ? 'Select a District first'
                : loadingCities
                ? 'Loading cities...'
                : cities.length === 0
                ? '(No cities registered in seed — manual entry supported)'
                : undefined
            }
            options={[
              {
                value: '',
                label: !selectedDistrictId
                  ? '-- Select District First --'
                  : loadingCities
                  ? 'Loading Cities...'
                  : cities.length === 0
                  ? '-- No Cities in Seed (Select/Enter) --'
                  : '-- Select City / Municipality --',
              },
              ...cities.map((c) => ({
                value: c.name,
                label: `${c.name}${c.tier ? ` (${c.tier.replace('_', ' ')})` : ''}`,
              })),
            ]}
          />
        </div>
      </div>

      {/* Row 3: Locality/Area & Pincode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          {localities.length > 0 ? (
            <Select
              label="Locality / Delivery Area"
              disabled={disabled || !selectedCityId || loadingLocalities}
              value={values.area || ''}
              onChange={handleLocalityChange}
              error={fieldErrors.area}
              helperText={
                loadingLocalities
                  ? 'Loading localities...'
                  : 'Select your commercial neighborhood or delivery area'
              }
              options={[
                {
                  value: '',
                  label: loadingLocalities
                    ? 'Loading Localities...'
                    : '-- Select Neighborhood / Locality --',
                },
                ...localities.map((l) => ({
                  value: l.name,
                  label: l.name,
                })),
              ]}
            />
          ) : (
            <Input
              label="Locality / Area (Optional)"
              disabled={disabled || !values.city}
              placeholder="e.g. Kothrud, Bandra West, Whitefield"
              value={values.area || ''}
              onChange={(e) => onChange({ area: e.target.value })}
              error={fieldErrors.area}
              helperText={
                !values.city
                  ? 'Select City first'
                  : 'Commercial neighborhood or delivery area'
              }
            />
          )}
        </div>

        <div>
          <div className="relative">
            <Input
              label="Postal PIN Code"
              required
              disabled={disabled}
              placeholder="6 numeric digits (e.g. 411035)"
              value={values.pincode || ''}
              onChange={handlePincodeChange}
              error={fieldErrors.pincode}
              helperText={
                lookingUpPin
                  ? 'Verifying with postal directory...'
                  : applicablePins.length > 0
                  ? `Canonical PINs: ${applicablePins.slice(0, 4).join(', ')}${applicablePins.length > 4 ? '...' : ''}`
                  : 'Standard 6-digit Indian PIN code'
              }
              list="applicable-pincodes-list"
            />
            {applicablePins.length > 0 && (
              <datalist id="applicable-pincodes-list">
                {applicablePins.map((pin) => (
                  <option key={pin} value={pin} />
                ))}
              </datalist>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
