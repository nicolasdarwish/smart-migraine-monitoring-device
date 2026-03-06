import { WeatherData } from '../types';

// WMO Weather interpretation codes
const getWeatherDescription = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow fall';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};

export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

export const fetchLocalWeather = async (): Promise<WeatherData | null> => {
  try {
    const position = await getCurrentPosition();
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    // Use Open-Meteo API (Free, no key required for non-commercial)
    // We specifically request surface_pressure as it's a key migraine indicator
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code,is_day`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');
    
    const data = await response.json();
    const current = data.current;

    return {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      pressure: current.surface_pressure, // Critical for AI
      weatherCode: current.weather_code,
      description: getWeatherDescription(current.weather_code),
      isDay: !!current.is_day,
      timestamp: Date.now()
    };
  } catch (error) {
    console.warn('Weather fetch failed, utilizing fallback:', error);
    return null;
  }
};