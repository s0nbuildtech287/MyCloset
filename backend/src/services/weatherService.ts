import axios from 'axios';

export interface WeatherInfo {
  temperature: number;
  condition: string;
  isRainy: boolean;
  weatherCode: number;
}

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherInfo> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const response = await axios.get(url, { timeout: 8000 });
    const current = response.data?.current_weather;

    if (!current) {
      throw new Error('Weather data unavailable from Open-Meteo API');
    }

    const code = current.weathercode;
    const temp = current.temperature;

    let condition = 'Nắng ráo';
    let isRainy = false;

    if (code === 0) {
      condition = 'Trời quang đãng';
    } else if (code >= 1 && code <= 3) {
      condition = 'Trời nhiều mây';
    } else if (code === 45 || code === 48) {
      condition = 'Có sương mù';
    } else if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
      condition = 'Có mưa rơi';
      isRainy = true;
    } else if (code >= 71 && code <= 77) {
      condition = 'Tuyết rơi';
      isRainy = true;
    } else if (code >= 95) {
      condition = 'Có dông bão';
      isRainy = true;
    }

    return {
      temperature: temp,
      condition,
      isRainy,
      weatherCode: code,
    };
  } catch (error) {
    console.error('Fetch weather error (falling back to default):', error);
    // Fallback default weather (Warm pleasant summer: 28°C)
    return {
      temperature: 28,
      condition: 'Trời nắng ráo (mặc định)',
      isRainy: false,
      weatherCode: 0,
    };
  }
};
