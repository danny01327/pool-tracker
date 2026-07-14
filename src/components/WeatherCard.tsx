import { useEffect, useState } from 'react'
import { fetchWeather, getCurrentPosition, poolCareTip, type Coords, type WeatherData } from '../lib/weather'

const LOCATION_KEY = 'pool-boy:location'

type Status = 'loading' | 'ready' | 'denied' | 'error'

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  async function load(forceRequest = false) {
    setStatus('loading')
    try {
      let coords: Coords
      const stored = !forceRequest && localStorage.getItem(LOCATION_KEY)
      if (stored) {
        coords = JSON.parse(stored)
      } else {
        coords = await getCurrentPosition()
        localStorage.setItem(LOCATION_KEY, JSON.stringify(coords))
      }
      const data = await fetchWeather(coords)
      setWeather(data)
      setStatus('ready')
    } catch (err: unknown) {
      const code = (err as { code?: number } | undefined)?.code
      setStatus(code === 1 ? 'denied' : 'error')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'loading') {
    return <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-sm text-gray-500">Loading weather…</div>
  }

  if (status === 'denied') {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-sm text-gray-500 flex items-center justify-between gap-2">
        <span>Enable location for weather-aware tips.</span>
        <button type="button" onClick={() => load(true)} className="underline shrink-0">
          Enable
        </button>
      </div>
    )
  }

  if (status === 'error' || !weather) {
    return null
  }

  const tip = poolCareTip(weather)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <div className="flex items-baseline justify-between">
        <span className="font-medium">Weather</span>
        <button type="button" onClick={() => load(true)} className="text-xs text-gray-500 underline">
          Update location
        </button>
      </div>
      <p className="mt-1">
        <span className="text-2xl font-bold">{weather.currentTempF}°F</span>{' '}
        <span className="text-sm text-gray-500">high {weather.todayHighF}°F</span>
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {weather.precipChancePct}% chance of rain today
        {weather.precipSumIn > 0 ? ` (~${weather.precipSumIn}" expected)` : ''}
      </p>
      {tip && <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">{tip}</p>}
    </div>
  )
}
