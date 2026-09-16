'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, MapPin, X, ChevronDown, Navigation, LocateFixed, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { storefrontApi } from '@/lib/api/storefront';
import { PopularCity } from '@/types/shop';

export interface SearchBarProps {
  initialSearch?: string;
  initialLocation?: string;
  onSearch: (params: {
    search: string;
    location: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialSearch = '',
  initialLocation = '',
  onSearch,
  className,
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [location, setLocation] = useState(initialLocation);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [popularCities, setPopularCities] = useState<PopularCity[]>([]);
  const locationRef = useRef<HTMLDivElement>(null);

  // Sync external changes
  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  // Fetch dynamic popular cities from Phase 2.2 endpoint
  useEffect(() => {
    let isMounted = true;
    storefrontApi
      .getPopularCities(10)
      .then((cities) => {
        if (isMounted && Array.isArray(cities)) {
          setPopularCities(cities);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCityDropdownOpen(false);
    onSearch({ search, location });
  };

  const handleSelectCity = (city: PopularCity) => {
    setLocation(city.cityName);
    setIsCityDropdownOpen(false);
    onSearch({ search, location: city.cityName });
  };

  // Genuine Geolocation API
  const handleSelectNearbyMe = () => {
    setIsLocating(true);
    setGeoError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsLocating(false);
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation('Current Location');
        setIsCityDropdownOpen(false);
        onSearch({
          search,
          location: 'Current Location',
          latitude: lat,
          longitude: lng,
          radiusKm: 10.0,
        });
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to determine your current location.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please select a city manually.';
        } else if (err.code === 2) {
          msg = 'Location is unavailable on your device. Please select a city manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again or select manually.';
        }
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClearLocation = () => {
    setLocation('');
    onSearch({ search, location: '' });
  };

  // Filter dynamic cities based on input text
  const filteredCities = useMemo(() => {
    if (!location || location.toLowerCase().includes('current') || location.toLowerCase().includes('near')) {
      return popularCities;
    }
    const q = location.toLowerCase();
    return popularCities.filter(
      (c) =>
        c.cityName.toLowerCase().includes(q) ||
        (c.stateName && c.stateName.toLowerCase().includes(q))
    );
  }, [location, popularCities]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'w-full bg-white rounded-2xl sm:rounded-full p-2 border border-brand-border/80 shadow-elevated flex flex-col sm:flex-row items-center gap-2 relative transition-shadow hover:shadow-lg focus-within:border-brand-plum/40 focus-within:ring-2 focus-within:ring-brand-plum/10',
        className
      )}
    >
      {/* Search Input */}
      <div className="flex-1 flex items-center px-3 sm:px-4 gap-2.5 w-full">
        <Search className="w-4 h-4 text-brand-plum shrink-0" />
        <input
          type="text"
          placeholder="Search by cake style, flavor, or bakery name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs sm:text-sm text-brand-espresso placeholder:text-brand-muted/70 bg-transparent focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-brand-muted hover:text-brand-espresso p-1 transition-colors rounded-full hover:bg-brand-cream/50"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="hidden sm:block w-px h-7 bg-brand-border/80" />

      {/* Location Input with Dynamic Popular Cities & Real GPS Dropdown */}
      <div ref={locationRef} className="relative w-full sm:w-64">
        <div className="flex items-center px-3 sm:px-3.5 gap-2 w-full">
          <MapPin className="w-4 h-4 text-brand-plum shrink-0" />
          <input
            type="text"
            placeholder="City, area or Near by Me"
            value={location}
            onFocus={() => setIsCityDropdownOpen(true)}
            onChange={(e) => {
              setLocation(e.target.value);
              setIsCityDropdownOpen(true);
            }}
            className="w-full text-xs sm:text-sm text-brand-espresso placeholder:text-brand-muted/70 bg-transparent focus:outline-none"
          />

          {/* Quick GPS Locate Button */}
          <button
            type="button"
            title="Use current location (GPS)"
            onClick={handleSelectNearbyMe}
            className={cn(
              'p-1 text-brand-muted hover:text-brand-plum transition-colors shrink-0 rounded-md hover:bg-brand-blush/60',
              isLocating && 'animate-spin text-brand-plum'
            )}
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>

          {location ? (
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-brand-muted hover:text-brand-espresso p-1 shrink-0 rounded-full hover:bg-brand-cream/50"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="text-brand-muted hover:text-brand-espresso p-1 shrink-0"
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isCityDropdownOpen && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isCityDropdownOpen && (
          <div className="absolute left-0 sm:right-0 top-full mt-3 w-full sm:w-84 bg-white rounded-2xl shadow-elevated border border-brand-border/80 p-2.5 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
            {/* GPS Error Alert */}
            {geoError && (
              <div className="p-2.5 mb-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                <span>{geoError}</span>
              </div>
            )}

            {/* Genuine Near by Me Action */}
            <button
              type="button"
              onClick={handleSelectNearbyMe}
              className="w-full px-3 py-2.5 rounded-xl bg-brand-blush/70 hover:bg-brand-blush text-brand-plum border border-brand-blush-border transition-all flex items-center justify-between mb-2 group shadow-2xs active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-brand-plum text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Navigation className={cn('w-3.5 h-3.5', isLocating ? 'animate-spin' : 'animate-pulse')} />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-brand-espresso group-hover:text-brand-plum">
                    Near by Me
                  </span>
                  <span className="block text-[10px] text-brand-muted">
                    Find bakeries closest to your GPS location
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-white/90 px-2 py-0.5 rounded-full text-brand-plum border border-brand-plum/10">
                GPS
              </span>
            </button>

            {/* Dynamic Popular Cities Header */}
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted border-b border-brand-border/50 flex items-center justify-between">
              <span>Popular Active Cities</span>
              <span className="text-[9px] font-normal text-brand-muted/70">Tap to select</span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-brand-border/30 py-1 scrollbar-thin">
              {filteredCities.map((city) => (
                <button
                  key={city.cityName}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className="w-full px-3 py-2 text-left text-xs text-brand-espresso hover:bg-brand-cream/60 rounded-xl transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-brand-plum group-hover:scale-110 transition-transform shrink-0" />
                    <span className="font-semibold truncate">{city.cityName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {city.stateName && (
                      <span className="text-[10px] text-brand-muted font-medium bg-brand-cream px-1.5 py-0.5 rounded-md">
                        {city.stateName}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-brand-plum bg-brand-blush/60 px-1.5 py-0.5 rounded-md">
                      {city.activeBakeryCount} {city.activeBakeryCount === 1 ? 'bakery' : 'bakeries'}
                    </span>
                  </div>
                </button>
              ))}

              {filteredCities.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-brand-muted">
                  Press enter or &ldquo;Find Bakeries&rdquo; to search for &ldquo;{location}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto px-1 sm:px-0">
        <Button
          type="submit"
          size="sm"
          className="w-full sm:w-auto rounded-xl sm:rounded-full px-5 py-2.5 h-10 font-bold shadow-sm"
        >
          <Search className="w-3.5 h-3.5 mr-1.5 sm:hidden" />
          Find Bakeries
        </Button>
      </div>
    </form>
  );
};
