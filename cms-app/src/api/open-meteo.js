/**
 * Open-Meteo API Integration
 *
 * Provides access to weather data including historical and forecast information.
 * Free API with no authentication required.
 *
 * @module api/open-meteo
 */

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * WMO Weather Code to human-readable format
 * Based on WMO code standard: https://open-meteo.com/en/docs
 */
export function weatherCodeToDescription(code) {
  const codeMap = {
    0: { emoji: "☀️", label: "Clear sky", severity: "good" },
    1: { emoji: "🌤️", label: "Mainly clear", severity: "good" },
    2: { emoji: "⛅", label: "Partly cloudy", severity: "good" },
    3: { emoji: "☁️", label: "Overcast", severity: "neutral" },
    45: { emoji: "🌫️", label: "Fog", severity: "poor" },
    48: { emoji: "🌫️", label: "Depositing rime fog", severity: "poor" },
    51: { emoji: "🌦️", label: "Light drizzle", severity: "poor" },
    53: { emoji: "🌦️", label: "Moderate drizzle", severity: "poor" },
    55: { emoji: "🌦️", label: "Dense drizzle", severity: "poor" },
    56: { emoji: "🧊🌦️", label: "Freezing drizzle", severity: "poor" },
    57: { emoji: "🧊🌦️", label: "Dense freezing drizzle", severity: "poor" },
    61: { emoji: "🌧️", label: "Slight rain", severity: "poor" },
    63: { emoji: "🌧️", label: "Moderate rain", severity: "poor" },
    65: { emoji: "🌧️", label: "Heavy rain", severity: "poor" },
    66: { emoji: "🧊🌧️", label: "Freezing rain", severity: "poor" },
    67: { emoji: "🧊🌧️", label: "Heavy freezing rain", severity: "poor" },
    71: { emoji: "🌨️", label: "Slight snow", severity: "poor" },
    73: { emoji: "🌨️", label: "Moderate snow", severity: "poor" },
    75: { emoji: "🌨️", label: "Heavy snow", severity: "poor" },
    77: { emoji: "❄️", label: "Snow grains", severity: "poor" },
    80: { emoji: "🌧️", label: "Slight rain showers", severity: "poor" },
    81: { emoji: "🌧️", label: "Moderate rain showers", severity: "poor" },
    82: { emoji: "🌧️", label: "Violent rain showers", severity: "poor" },
    85: { emoji: "🌨️", label: "Slight snow showers", severity: "poor" },
    86: { emoji: "🌨️", label: "Heavy snow showers", severity: "poor" },
    95: { emoji: "⛈️", label: "Thunderstorm", severity: "poor" },
    96: { emoji: "⛈️🧊", label: "Thunderstorm with hail", severity: "poor" },
    99: { emoji: "⛈️🧊", label: "Thunderstorm with heavy hail", severity: "poor" },
  };

  return codeMap[code] || { emoji: "❓", label: `Unknown (${code})`, severity: "neutral" };
}

/**
 * Fetches historical and forecast weather data from Open-Meteo API
 *
 * @param {Object} options - Configuration options
 * @param {number} options.latitude - Latitude (default: Walla Walla, WA)
 * @param {number} options.longitude - Longitude (default: Walla Walla, WA)
 * @param {string} options.timezone - IANA timezone (default: America/Los_Angeles)
 * @param {string} options.temperatureUnit - fahrenheit or celsius (default: fahrenheit)
 * @param {number} options.pastDays - Days of historical data (0-92, default: 30)
 * @param {number} options.forecastDays - Days of forecast (0-16, default: 7)
 * @returns {Promise<Object>} Weather data with daily time series
 */
export async function fetchDailyForecast({
  latitude = 46.08,
  longitude = -118.31,
  timezone = "America/Los_Angeles",
  temperatureUnit = "fahrenheit",
  pastDays = 30,
  forecastDays = 7,
} = {}) {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      timezone: timezone,
      past_days: pastDays.toString(),
      forecast_days: forecastDays.toString(),
      temperature_unit: temperatureUnit,
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Open-Meteo API error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    throw error;
  }
}
