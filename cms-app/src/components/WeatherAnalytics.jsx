import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchDailyForecast, weatherCodeToDescription } from '../api/open-meteo';
import { getDailyVisitsInRange } from '../api/analytics-crud';

function WeatherAnalytics() {
  const [weatherData, setWeatherData] = useState(null);
  const [visitsData, setVisitsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch both weather and visits data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch last 30 days of weather + 7 day forecast
        const weather = await fetchDailyForecast({
          pastDays: 30,
          forecastDays: 7,
        });

        if (!weather || !weather.daily) {
          throw new Error('Invalid weather data received from API');
        }

        // Calculate date range for visits (last 30 days)
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);

        const visits = await getDailyVisitsInRange(
          startDate.toISOString().split('T')[0],
          endDate
        );

        setWeatherData(weather);
        setVisitsData(visits || []);
      } catch (err) {
        console.error('Failed to load weather/visits data:', err);
        setError(`Failed to load data: ${err.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to format dates
  const formatDateShort = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Combine weather and visits data for historical analysis
  const historicalData = useMemo(() => {
    if (!weatherData || !visitsData) return [];

    const weatherDates = weatherData.daily?.time || [];
    const weatherCodes = weatherData.daily?.weather_code || [];
    const tempMax = weatherData.daily?.temperature_2m_max || [];
    const tempMin = weatherData.daily?.temperature_2m_min || [];
    const precipitation = weatherData.daily?.precipitation_sum || [];

    // Create a map of visits by date
    const visitsMap = new Map();
    visitsData.forEach(visit => {
      visitsMap.set(visit.dateString, visit.count || 0);
    });

    // Get today's date to separate historical from forecast
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const combined = [];
    for (let i = 0; i < weatherDates.length; i++) {
      const dateStr = weatherDates[i];
      const date = new Date(dateStr + 'T00:00:00');

      // Only include historical data (not future forecasts)
      if (date > today) continue;

      const weatherInfo = weatherCodeToDescription(weatherCodes[i]);

      combined.push({
        date: dateStr,
        displayDate: formatDateShort(dateStr),
        visits: visitsMap.get(dateStr) || 0,
        tempMax: tempMax[i],
        tempMin: tempMin[i],
        precipitation: precipitation[i],
        weatherCode: weatherCodes[i],
        weatherLabel: weatherInfo.label,
        weatherEmoji: weatherInfo.emoji,
        weatherSeverity: weatherInfo.severity,
      });
    }

    return combined.sort((a, b) => a.date.localeCompare(b.date));
  }, [weatherData, visitsData]);

  // Extract forecast data (next 7 days)
  const forecastData = useMemo(() => {
    if (!weatherData) return [];

    const weatherDates = weatherData.daily?.time || [];
    const weatherCodes = weatherData.daily?.weather_code || [];
    const tempMax = weatherData.daily?.temperature_2m_max || [];
    const tempMin = weatherData.daily?.temperature_2m_min || [];
    const precipitation = weatherData.daily?.precipitation_sum || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const forecast = [];
    for (let i = 0; i < weatherDates.length; i++) {
      const dateStr = weatherDates[i];
      const date = new Date(dateStr + 'T00:00:00');

      // Only include future dates
      if (date <= today) continue;

      const weatherInfo = weatherCodeToDescription(weatherCodes[i]);

      forecast.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tempMax: tempMax[i],
        tempMin: tempMin[i],
        precipitation: precipitation[i],
        weatherCode: weatherCodes[i],
        weatherLabel: weatherInfo.label,
        weatherEmoji: weatherInfo.emoji,
        weatherSeverity: weatherInfo.severity,
      });
    }

    return forecast;
  }, [weatherData]);

  // Calculate correlation statistics
  const stats = useMemo(() => {
    if (historicalData.length === 0) {
      return {
        avgVisitsGoodWeather: 0,
        avgVisitsPoorWeather: 0,
        totalDays: 0,
      };
    }

    const goodWeatherDays = historicalData.filter(d => d.weatherSeverity === 'good');
    const poorWeatherDays = historicalData.filter(d => d.weatherSeverity === 'poor');

    const avgGood = goodWeatherDays.length > 0
      ? Math.round(goodWeatherDays.reduce((sum, d) => sum + d.visits, 0) / goodWeatherDays.length)
      : 0;

    const avgPoor = poorWeatherDays.length > 0
      ? Math.round(poorWeatherDays.reduce((sum, d) => sum + d.visits, 0) / poorWeatherDays.length)
      : 0;

    return {
      avgVisitsGoodWeather: avgGood,
      avgVisitsPoorWeather: avgPoor,
      totalDays: historicalData.length,
      goodWeatherDays: goodWeatherDays.length,
      poorWeatherDays: poorWeatherDays.length,
    };
  }, [historicalData]);

  if (isLoading) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-2">Loading weather and visit data...</div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Weather Impact Analysis</h2>

      {/* Summary Statistics */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success mb-2">
                ☀️ {stats.avgVisitsGoodWeather}
              </h3>
              <Card.Text className="text-muted">Avg Visits (Good Weather)</Card.Text>
              <small className="text-muted">{stats.goodWeatherDays} days</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary mb-2">
                🌧️ {stats.avgVisitsPoorWeather}
              </h3>
              <Card.Text className="text-muted">Avg Visits (Poor Weather)</Card.Text>
              <small className="text-muted">{stats.poorWeatherDays} days</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info mb-2">
                {stats.avgVisitsGoodWeather - stats.avgVisitsPoorWeather > 0 ? '+' : ''}
                {stats.avgVisitsGoodWeather - stats.avgVisitsPoorWeather}
              </h3>
              <Card.Text className="text-muted">Weather Impact</Card.Text>
              <small className="text-muted">Difference in visits</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Historical Weather vs Visits Chart */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Historical Weather vs Customer Visits (Last 30 Days)</h5>
          {historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="displayDate"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" label={{ value: 'Visits', angle: -90, position: 'insideLeft' }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Temperature (°F)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.displayDate}</p>
                          <p style={{ margin: 0 }}>{data.weatherEmoji} {data.weatherLabel}</p>
                          <p style={{ margin: 0, color: '#0d6efd' }}>Visits: {data.visits}</p>
                          <p style={{ margin: 0, color: '#dc3545' }}>High: {data.tempMax}°F</p>
                          <p style={{ margin: 0, color: '#6c757d' }}>Low: {data.tempMin}°F</p>
                          {data.precipitation > 0 && (
                            <p style={{ margin: 0, color: '#0dcaf0' }}>Rain: {data.precipitation} in</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="visits" name="Customer Visits" fill="#0d6efd" />
                <Line yAxisId="right" type="monotone" dataKey="tempMax" name="High Temp (°F)" stroke="#dc3545" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="tempMin" name="Low Temp (°F)" stroke="#6c757d" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-5 text-muted">No historical data available</div>
          )}
        </Card.Body>
      </Card>

      {/* 7-Day Forecast */}
      <Card>
        <Card.Body>
          <h5 className="mb-3">7-Day Weather Forecast</h5>
          {forecastData.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Date</th>
                  <th>Weather</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Precipitation</th>
                  <th>Expected Impact</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((day) => (
                  <tr key={day.date}>
                    <td>{day.dayOfWeek}</td>
                    <td>{day.displayDate}</td>
                    <td>
                      <span style={{ fontSize: '1.5em' }}>{day.weatherEmoji}</span>
                      {' '}
                      {day.weatherLabel}
                    </td>
                    <td>{Math.round(day.tempMax)}°F</td>
                    <td>{Math.round(day.tempMin)}°F</td>
                    <td>{day.precipitation > 0 ? `${day.precipitation} in` : 'None'}</td>
                    <td>
                      {day.weatherSeverity === 'good' ? (
                        <Badge bg="success">Higher visits expected</Badge>
                      ) : day.weatherSeverity === 'poor' ? (
                        <Badge bg="warning">Lower visits expected</Badge>
                      ) : (
                        <Badge bg="secondary">Typical visits</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-3 text-muted">No forecast data available</div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default WeatherAnalytics;
