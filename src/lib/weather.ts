export interface Coords {
  lat: number
  lon: number
}

export interface WeatherData {
  currentTempF: number
  todayHighF: number
  precipChancePct: number
  precipSumIn: number
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { maximumAge: 30 * 60 * 1000, timeout: 10000 },
    )
  })
}

// Open-Meteo: free, no API key or account required.
export async function fetchWeather({ lat, lon }: Coords): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max` +
    `&temperature_unit=fahrenheit&precipitation_unit=inch&forecast_days=1&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch weather')
  const json = await res.json()
  return {
    currentTempF: Math.round(json.current.temperature_2m),
    todayHighF: Math.round(json.daily.temperature_2m_max[0]),
    precipChancePct: Math.round(json.daily.precipitation_probability_max[0]),
    precipSumIn: json.daily.precipitation_sum[0],
  }
}

export function poolCareTip(weather: WeatherData): string | undefined {
  if (weather.precipChancePct >= 50) {
    return 'Rain likely today — it can dilute chemicals, lower pH/CYA, and wash in debris. Worth retesting after any heavy rain.'
  }
  if (weather.todayHighF >= 90) {
    return 'Hot day — chlorine burns off faster in heat and strong sun. Consider testing FC more than usual today.'
  }
  return undefined
}
