'use client';

import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { storefrontApi } from '@/lib/api/storefront';
import { PopularCity } from '@/types/shop';

interface IndianCityPillsProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  className?: string;
}

export const IndianCityPills: React.FC<IndianCityPillsProps> = ({
  selectedCity,
  onSelectCity,
  className = '',
}) => {
  const [popularCities, setPopularCities] = useState<PopularCity[]>([]);

  useEffect(() => {
    let isMounted = true;
    storefrontApi
      .getPopularCities(10)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setPopularCities(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const cities = ['ALL', ...popularCities.map((c) => c.cityName)];

  if (cities.length <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none ${className}`}>
      {cities.map((cityName) => {
        const isSelected =
          selectedCity.toLowerCase() === cityName.toLowerCase() ||
          (cityName === 'ALL' && !selectedCity);

        return (
          <button
            key={cityName}
            type="button"
            onClick={() => onSelectCity(cityName === 'ALL' ? '' : cityName)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              isSelected
                ? 'bg-brand-plum text-white shadow-soft scale-105 border border-brand-plum'
                : 'bg-white/90 text-brand-espresso hover:bg-white border border-brand-border/70 hover:shadow-xs'
            }`}
          >
            <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-brand-plum'}`} />
            <span>{cityName === 'ALL' ? 'All India' : cityName}</span>
          </button>
        );
      })}
    </div>
  );
};
