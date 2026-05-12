import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';
import clsx from 'clsx';

const DEFAULT_LOCATION = { lat: 28.6139, lon: 77.2090, name: 'New Delhi' };

export function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [locationType, setLocationType] = useState('Local'); // 'GPS' or 'Local'
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION.name);
  const [loading, setLoading] = useState(true);

  const fetchWeather = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature`
      );
      const data = await response.json();
      if (data.current_weather) {
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          code: data.current_weather.weathercode,
          feelsLike: data.hourly ? Math.round(data.hourly.apparent_temperature[0]) : null,
        });
      }
    } catch (error) {
      console.error('Weather fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCityName = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
      );
      const data = await response.json();
      if (data?.address) {
        return data.address.city || data.address.town || data.address.village || data.address.state_district || data.address.state || 'Your Location';
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e);
    }
    return 'Your Location';
  };

  useEffect(() => {
    const getLocationAndWeather = () => {
      console.log('Attempting to get location...');
      if ("geolocation" in navigator) {
        // Add a timeout to geolocation to prevent hanging
        const timeoutId = setTimeout(() => {
          console.log('Geolocation timed out, falling back to New Delhi');
          setLocationName(DEFAULT_LOCATION.name);
          fetchWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
        }, 5000);

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            clearTimeout(timeoutId);
            console.log('GPS location acquired');
            setLocationType('GPS');
            const cityName = await fetchCityName(position.coords.latitude, position.coords.longitude);
            setLocationName(cityName);
            fetchWeather(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.log('Geolocation error, falling back:', error.message);
            setLocationName(DEFAULT_LOCATION.name);
            fetchWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
          },
          { timeout: 5000 }
        );
      } else {
        console.log('Geolocation not supported, falling back');
        setLocationName(DEFAULT_LOCATION.name);
        fetchWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
      }
    };

    getLocationAndWeather();

    // Refresh every 30 minutes
    const interval = setInterval(getLocationAndWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getShortName = (name) => {
    if (!name || name === 'Your Location') return 'LOC';
    // Remove common suffixes and spaces
    const clean = name.replace(/City|Town|Village|District|State/gi, '').trim();
    if (clean.length <= 3) return clean.toUpperCase();
    
    // Check for specific known cities for better codes
    const manual = {
      'Guwahati': 'GHY',
      'New Delhi': 'DEL',
      'Mumbai': 'BOM',
      'Bangalore': 'BLR',
      'Bengaluru': 'BLR',
      'London': 'LDN',
      'New York': 'NYC',
      'San Francisco': 'SFO'
    };
    if (manual[clean]) return manual[clean];

    // Otherwise take first 3 letters or consonants
    return clean.substring(0, 3).toUpperCase();
  };

  if (loading || !weather) return null;

  const getWeatherIcon = (code) => {
    if (code === 0) return <Sun className="text-orange-400" size={14} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-blue-400" size={14} />;
    if (code >= 51 && code <= 67) return <CloudRain className="text-blue-500" size={14} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-indigo-300" size={14} />;
    if (code >= 80 && code <= 82) return <CloudRain className="text-blue-600" size={14} />;
    if (code >= 95) return <CloudLightning className="text-yellow-500" size={14} />;
    return <Wind className="text-gray-400" size={14} />;
  };

  const getConditionText = (code) => {
    if (code === 0) return 'Clear sky';
    if (code >= 1 && code <= 3) return 'Partly cloudy';
    if (code >= 51 && code <= 67) return 'Rainy';
    if (code >= 71 && code <= 77) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Unknown';
  };

  return (
    <div className="group relative flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-default overflow-hidden">
      <div className="flex items-center gap-2">
        {getWeatherIcon(weather.code)}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">
            {getShortName(locationName)}
          </span>
          <span className="text-[11px] font-black tracking-tighter text-white leading-none">
            {weather.temp}°C
          </span>
        </div>
      </div>
      
      <div className={clsx(
        "w-1 h-1 rounded-full",
        locationType === 'GPS' ? "bg-accent animate-pulse" : "bg-gray-600"
      )} />

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-50">
        <div className="glass-popover px-4 py-3 rounded-2xl min-w-[160px] shadow-2xl border border-white/10">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
              {locationName}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-semibold text-text-primary">
                {getConditionText(weather.code)}
              </span>
            </div>
            {weather.feelsLike !== null && (
              <span className="text-[11px] text-text-secondary">
                Feels like {weather.feelsLike}°C
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
