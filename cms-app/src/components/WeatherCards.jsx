import React, { useMemo, useState } from "react";
import { fetchDailyForecast } from "../api/open-meteo";

/**
 * Expects Open-Meteo daily JSON shaped like:
 * {
  "latitude": 46.088997,
  "longitude": -118.30637,
  "generationtime_ms": 92.3963785171509,
  "utc_offset_seconds": -28800,
  "timezone": "America/Los_Angeles",
  "timezone_abbreviation": "GMT-8",
  "elevation": 325,
  "daily_units": {
    "time": "iso8601",
    "weather_code": "wmo code",
    "temperature_2m_max": "°F"
  },
  "daily": {
    "time": [
      "2025-12-21",
      "2025-12-22",
      "2025-12-23",
      "2025-12-24",
      "2025-12-25",
      "2025-12-26",
      "2025-12-27",
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
      "2026-01-11",
      "2026-01-12",
      "2026-01-13",
      "2026-01-14",
      "2026-01-15",
      "2026-01-16",
      "2026-01-17",
      "2026-01-18",
      "2026-01-19",
      "2026-01-20",
      "2026-01-21",
      "2026-01-22",
      "2026-01-23",
      "2026-01-24",
      "2026-01-25",
      "2026-01-26",
      "2026-01-27"
    ],
    "weather_code": [3, 53, 51, 45, 51, 75, 3, 3, 2, 3, 45, 71, 53, 45, 51, 51, 3, 53, 3, 3, 3, 3, 3, 3, 3, 45, 45, 45, 3, 3, 3, 3, 3, 3, 0, 0, 3, 3],
    "temperature_2m_max": [42.7, 52.9, 43, 56.8, 39.9, 47, 38.1, 36, 35.3, 34.1, 33.2, 30.6, 37.3, 48.1, 50.6, 47.6, 45.9, 45.5, 42.7, 49.5, 47.5, 52.2, 61.9, 58.1, 47.8, 38.6, 35.7, 34.9, 32.4, 32.9, 32.8, 34.7, 34.2, 37.2, 38.9, 39.2, 40, 42.1]
  }
}
*/

function weatherCodeToInfo(code) {
  // Practical WMO mapping (expand if you want)
  if (code === 0) return { emoji: "☀️", label: "Clear" };
  if (code === 1) return { emoji: "🌤️", label: "Mainly clear" };
  if (code === 2) return { emoji: "⛅", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Fog" };

  if ([51, 53, 55].includes(code)) return { emoji: "🌦️", label: "Drizzle" };
  if ([56, 57].includes(code)) return { emoji: "🧊🌦️", label: "Freezing drizzle" };
  if ([61, 63, 65].includes(code)) return { emoji: "🌧️", label: "Rain" };
  if ([66, 67].includes(code)) return { emoji: "🧊🌧️", label: "Freezing rain" };

  if ([71, 73, 75].includes(code)) return { emoji: "🌨️", label: "Snow" };
  if (code === 77) return { emoji: "❄️", label: "Snow grains" };
  if ([80, 81, 82].includes(code)) return { emoji: "🌧️", label: "Rain showers" };
  if ([85, 86].includes(code)) return { emoji: "🌨️", label: "Snow showers" };

  if (code === 95) return { emoji: "⛈️", label: "Thunderstorm" };
  if ([96, 99].includes(code)) return { emoji: "⛈️🧊", label: "Thunderstorm (hail)" };

  return { emoji: "❓", label: `Code ${code}` };
}

function fmtDow(date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}
function fmtMonthDay(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function round1(n) {
  return Math.round(n * 10) / 10;
}

export default function WeatherCards({
  data = fetchDailyForecast(), // <-- pass the full Open-Meteo JSON here
  title = "7-Day Forecast",
}) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const t = data?.daily?.time ?? [];
    const codes = data?.daily?.weather_code ?? [];
    const maxT = data?.daily?.temperature_2m_max ?? [];

    const len = Math.min(t.length, codes.length, maxT.length);
    const out = [];

    for (let i = 0; i < len; i++) {
      const dayStr = t[i]; // "YYYY-MM-DD"
      const date = new Date(`${dayStr}T00:00:00`);
      const code = codes[i];
      const info = weatherCodeToInfo(code);

      out.push({
        dayStr,
        date,
        weatherCode: code,
        weather: info,
        tempMax: round1(maxT[i]),
      });
    }

    return out;
  }, [data]);

  const unit = data?.daily_units?.temperature_2m_max ?? "°";

  const maxWeekOffset = Math.max(0, Math.floor((days.length - 1) / 7));
  const visibleDays = useMemo(() => {
    const start = weekOffset * 7;
    return days.slice(start, start + 7);
  }, [days, weekOffset]);

  function prevWeek() {
    setWeekOffset((w) => Math.max(0, w - 1));
  }
  function nextWeek() {
    setWeekOffset((w) => Math.min(maxWeekOffset, w + 1));
  }

  if (!data) {
    return (
      <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        No weather data yet.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button onClick={prevWeek} disabled={weekOffset === 0} style={btnStyle}>
          ←
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            {data.timezone} • Showing days {weekOffset * 7 + 1}–
            {Math.min(weekOffset * 7 + 7, days.length)} of {days.length}
          </div>
        </div>

        <button onClick={nextWeek} disabled={weekOffset >= maxWeekOffset} style={btnStyle}>
          →
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleDays.map((d) => (
          <div key={d.dayStr} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {fmtDow(d.date)} • {fmtMonthDay(d.date)}
                </div>
                <div style={{ opacity: 0.85, fontSize: 13 }}>
                  {d.weather.emoji} {d.weather.label}
                  <span style={{ opacity: 0.55 }}> (code {d.weatherCode})</span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {d.tempMax}
                  {unit}
                </div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>Max temp</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "white",
  cursor: "pointer",
};

const cardStyle = {
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 14,
  padding: 12,
  background: "white",
  boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
};
