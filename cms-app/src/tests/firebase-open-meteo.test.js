/* eslint-env vitest */
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { fetchDailyForecast, weatherCodeToDescription } from '../api/open-meteo.js';

describe("Open-Meteo API Functions", () => {
  describe("weatherCodeToDescription", () => {
    test("returns correct data for clear sky (code 0)", () => {
      const result = weatherCodeToDescription(0);

      expect(result).toEqual({
        emoji: "☀️",
        label: "Clear sky",
        severity: "good"
      });
    });

    test("returns correct data for mainly clear (code 1)", () => {
      const result = weatherCodeToDescription(1);

      expect(result).toEqual({
        emoji: "🌤️",
        label: "Mainly clear",
        severity: "good"
      });
    });

    test("returns correct data for partly cloudy (code 2)", () => {
      const result = weatherCodeToDescription(2);

      expect(result).toEqual({
        emoji: "⛅",
        label: "Partly cloudy",
        severity: "good"
      });
    });

    test("returns correct data for overcast (code 3)", () => {
      const result = weatherCodeToDescription(3);

      expect(result).toEqual({
        emoji: "☁️",
        label: "Overcast",
        severity: "neutral"
      });
    });

    test("returns correct data for fog (code 45)", () => {
      const result = weatherCodeToDescription(45);

      expect(result).toEqual({
        emoji: "🌫️",
        label: "Fog",
        severity: "poor"
      });
    });

    test("returns correct data for depositing rime fog (code 48)", () => {
      const result = weatherCodeToDescription(48);

      expect(result).toEqual({
        emoji: "🌫️",
        label: "Depositing rime fog",
        severity: "poor"
      });
    });

    test("returns correct data for light drizzle (code 51)", () => {
      const result = weatherCodeToDescription(51);

      expect(result).toEqual({
        emoji: "🌦️",
        label: "Light drizzle",
        severity: "poor"
      });
    });

    test("returns correct data for moderate drizzle (code 53)", () => {
      const result = weatherCodeToDescription(53);

      expect(result).toEqual({
        emoji: "🌦️",
        label: "Moderate drizzle",
        severity: "poor"
      });
    });

    test("returns correct data for dense drizzle (code 55)", () => {
      const result = weatherCodeToDescription(55);

      expect(result).toEqual({
        emoji: "🌦️",
        label: "Dense drizzle",
        severity: "poor"
      });
    });

    test("returns correct data for slight rain (code 61)", () => {
      const result = weatherCodeToDescription(61);

      expect(result).toEqual({
        emoji: "🌧️",
        label: "Slight rain",
        severity: "poor"
      });
    });

    test("returns correct data for moderate rain (code 63)", () => {
      const result = weatherCodeToDescription(63);

      expect(result).toEqual({
        emoji: "🌧️",
        label: "Moderate rain",
        severity: "poor"
      });
    });

    test("returns correct data for heavy rain (code 65)", () => {
      const result = weatherCodeToDescription(65);

      expect(result).toEqual({
        emoji: "🌧️",
        label: "Heavy rain",
        severity: "poor"
      });
    });

    test("returns correct data for slight snow (code 71)", () => {
      const result = weatherCodeToDescription(71);

      expect(result).toEqual({
        emoji: "🌨️",
        label: "Slight snow",
        severity: "poor"
      });
    });

    test("returns correct data for moderate snow (code 73)", () => {
      const result = weatherCodeToDescription(73);

      expect(result).toEqual({
        emoji: "🌨️",
        label: "Moderate snow",
        severity: "poor"
      });
    });

    test("returns correct data for heavy snow (code 75)", () => {
      const result = weatherCodeToDescription(75);

      expect(result).toEqual({
        emoji: "🌨️",
        label: "Heavy snow",
        severity: "poor"
      });
    });

    test("returns correct data for snow grains (code 77)", () => {
      const result = weatherCodeToDescription(77);

      expect(result).toEqual({
        emoji: "❄️",
        label: "Snow grains",
        severity: "poor"
      });
    });

    test("returns correct data for thunderstorm (code 95)", () => {
      const result = weatherCodeToDescription(95);

      expect(result).toEqual({
        emoji: "⛈️",
        label: "Thunderstorm",
        severity: "poor"
      });
    });

    test("returns correct data for thunderstorm with hail (code 96)", () => {
      const result = weatherCodeToDescription(96);

      expect(result).toEqual({
        emoji: "⛈️🧊",
        label: "Thunderstorm with hail",
        severity: "poor"
      });
    });

    test("returns correct data for thunderstorm with heavy hail (code 99)", () => {
      const result = weatherCodeToDescription(99);

      expect(result).toEqual({
        emoji: "⛈️🧊",
        label: "Thunderstorm with heavy hail",
        severity: "poor"
      });
    });

    test("returns unknown code for invalid weather code", () => {
      const result = weatherCodeToDescription(999);

      expect(result).toEqual({
        emoji: "❓",
        label: "Unknown (999)",
        severity: "neutral"
      });
    });

    test("handles negative weather codes", () => {
      const result = weatherCodeToDescription(-1);

      expect(result).toEqual({
        emoji: "❓",
        label: "Unknown (-1)",
        severity: "neutral"
      });
    });

    test("categorizes good weather correctly", () => {
      const goodWeatherCodes = [0, 1, 2];

      goodWeatherCodes.forEach(code => {
        const result = weatherCodeToDescription(code);
        expect(result.severity).toBe("good");
      });
    });

    test("categorizes poor weather correctly", () => {
      const poorWeatherCodes = [45, 51, 61, 71, 95];

      poorWeatherCodes.forEach(code => {
        const result = weatherCodeToDescription(code);
        expect(result.severity).toBe("poor");
      });
    });

    test("categorizes neutral weather correctly", () => {
      const neutralWeatherCodes = [3];

      neutralWeatherCodes.forEach(code => {
        const result = weatherCodeToDescription(code);
        expect(result.severity).toBe("neutral");
      });
    });
  });

  describe("fetchDailyForecast", () => {
    let fetchSpy;

    // Mock response data
    const mockWeatherResponse = {
      latitude: 46.08,
      longitude: -118.31,
      timezone: "America/Los_Angeles",
      daily: {
        time: ["2026-01-25", "2026-01-26", "2026-01-27"],
        weather_code: [0, 3, 61],
        temperature_2m_max: [45.5, 42.3, 38.7],
        temperature_2m_min: [32.1, 30.5, 28.9],
        precipitation_sum: [0, 0, 0.5]
      },
      daily_units: {
        time: "iso8601",
        weather_code: "wmo code",
        temperature_2m_max: "°F",
        temperature_2m_min: "°F",
        precipitation_sum: "inch"
      }
    };

    beforeEach(() => {
      // Mock fetch before each test
      fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
      // Restore fetch after each test
      fetchSpy.mockRestore();
    });

    test("successfully fetches weather data with default parameters", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      const result = await fetchDailyForecast();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWeatherResponse);
      expect(result.daily.time).toBeInstanceOf(Array);
      expect(result.daily.weather_code).toBeInstanceOf(Array);
    });

    test("constructs correct URL with default parameters", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      await fetchDailyForecast();

      const calledUrl = fetchSpy.mock.calls[0][0];

      expect(calledUrl).toContain("latitude=46.08");
      expect(calledUrl).toContain("longitude=-118.31");
      expect(calledUrl).toContain("timezone=America%2FLos_Angeles");
      expect(calledUrl).toContain("temperature_unit=fahrenheit");
      expect(calledUrl).toContain("past_days=30");
      expect(calledUrl).toContain("forecast_days=7");
      expect(calledUrl).toContain("daily=weather_code%2Ctemperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum");
    });

    test("accepts custom latitude and longitude", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      await fetchDailyForecast({
        latitude: 47.6062,
        longitude: -122.3321
      });

      const calledUrl = fetchSpy.mock.calls[0][0];

      expect(calledUrl).toContain("latitude=47.6062");
      expect(calledUrl).toContain("longitude=-122.3321");
    });

    test("accepts custom timezone", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      await fetchDailyForecast({
        timezone: "America/New_York"
      });

      const calledUrl = fetchSpy.mock.calls[0][0];

      expect(calledUrl).toContain("timezone=America%2FNew_York");
    });

    test("accepts custom temperature unit (celsius)", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      await fetchDailyForecast({
        temperatureUnit: "celsius"
      });

      const calledUrl = fetchSpy.mock.calls[0][0];

      expect(calledUrl).toContain("temperature_unit=celsius");
    });

    test("accepts custom past days and forecast days", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      await fetchDailyForecast({
        pastDays: 7,
        forecastDays: 14
      });

      const calledUrl = fetchSpy.mock.calls[0][0];

      expect(calledUrl).toContain("past_days=7");
      expect(calledUrl).toContain("forecast_days=14");
    });

    test("throws error when API returns non-200 status", async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "Invalid parameters"
      });

      await expect(fetchDailyForecast()).rejects.toThrow("Open-Meteo API error 400");

      consoleErrorSpy.mockRestore();
    });

    test("throws error when API returns 500 status", async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error"
      });

      await expect(fetchDailyForecast()).rejects.toThrow("Open-Meteo API error 500");

      consoleErrorSpy.mockRestore();
    });

    test("throws error when network request fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchDailyForecast()).rejects.toThrow("Network error");

      consoleErrorSpy.mockRestore();
    });

    test("returns correct data structure", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      const result = await fetchDailyForecast();

      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('daily');
      expect(result).toHaveProperty('daily_units');
      expect(result.daily).toHaveProperty('time');
      expect(result.daily).toHaveProperty('weather_code');
      expect(result.daily).toHaveProperty('temperature_2m_max');
      expect(result.daily).toHaveProperty('temperature_2m_min');
      expect(result.daily).toHaveProperty('precipitation_sum');
    });

    test("handles empty daily data arrays", async () => {
      const emptyResponse = {
        ...mockWeatherResponse,
        daily: {
          time: [],
          weather_code: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          precipitation_sum: []
        }
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse
      });

      const result = await fetchDailyForecast();

      expect(result.daily.time).toEqual([]);
      expect(result.daily.weather_code).toEqual([]);
    });

    test("makes only one API call per invocation", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      await fetchDailyForecast();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integration tests", () => {
    let fetchSpy;

    const mockWeatherResponse = {
      latitude: 46.08,
      longitude: -118.31,
      timezone: "America/Los_Angeles",
      daily: {
        time: ["2026-01-25", "2026-01-26", "2026-01-27"],
        weather_code: [0, 61, 95],
        temperature_2m_max: [45.5, 38.7, 35.2],
        temperature_2m_min: [32.1, 28.9, 25.5],
        precipitation_sum: [0, 0.5, 1.2]
      },
      daily_units: {
        time: "iso8601",
        weather_code: "wmo code",
        temperature_2m_max: "°F",
        temperature_2m_min: "°F",
        precipitation_sum: "inch"
      }
    };

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    test("fetch weather data and decode all weather codes", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      const weatherData = await fetchDailyForecast();

      // Decode each weather code
      const decodedWeather = weatherData.daily.weather_code.map(code =>
        weatherCodeToDescription(code)
      );

      expect(decodedWeather[0].label).toBe("Clear sky");
      expect(decodedWeather[0].severity).toBe("good");

      expect(decodedWeather[1].label).toBe("Slight rain");
      expect(decodedWeather[1].severity).toBe("poor");

      expect(decodedWeather[2].label).toBe("Thunderstorm");
      expect(decodedWeather[2].severity).toBe("poor");
    });

    test("combine weather data with descriptions for analytics", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      const weatherData = await fetchDailyForecast();

      const combinedData = weatherData.daily.time.map((date, index) => ({
        date: date,
        weatherCode: weatherData.daily.weather_code[index],
        weatherDescription: weatherCodeToDescription(weatherData.daily.weather_code[index]),
        tempMax: weatherData.daily.temperature_2m_max[index],
        tempMin: weatherData.daily.temperature_2m_min[index],
        precipitation: weatherData.daily.precipitation_sum[index]
      }));

      expect(combinedData).toHaveLength(3);
      expect(combinedData[0]).toHaveProperty('date');
      expect(combinedData[0]).toHaveProperty('weatherCode');
      expect(combinedData[0]).toHaveProperty('weatherDescription');
      expect(combinedData[0].weatherDescription).toHaveProperty('emoji');
      expect(combinedData[0].weatherDescription).toHaveProperty('label');
      expect(combinedData[0].weatherDescription).toHaveProperty('severity');
    });

    test("filter data by weather severity", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse
      });

      const weatherData = await fetchDailyForecast();

      const weatherWithSeverity = weatherData.daily.weather_code.map(code => ({
        code,
        description: weatherCodeToDescription(code)
      }));

      const goodWeatherDays = weatherWithSeverity.filter(w => w.description.severity === 'good');
      const poorWeatherDays = weatherWithSeverity.filter(w => w.description.severity === 'poor');

      expect(goodWeatherDays).toHaveLength(1);
      expect(poorWeatherDays).toHaveLength(2);
    });
  });
});
