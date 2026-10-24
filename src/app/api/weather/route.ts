import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const lat = Number(params.get('lat') ?? '19.0760')
  const lon = Number(params.get('lon') ?? '72.8777')
  const ward = (params.get('ward') ?? 'Mumbai').slice(0, 80)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid latitude or longitude.' }, { status: 400 })
  }
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,wind_speed_10m',
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,uv_index,precipitation_probability',
    daily: 'temperature_2m_max,apparent_temperature_max,uv_index_max,sunrise,sunset,precipitation_probability_max',
    timezone: 'Asia/Kolkata', forecast_days: '3',
  }).toString()
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(9000) })
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`)
    const data = await response.json()
    return NextResponse.json({ source: 'Open-Meteo', fetched_at: new Date().toISOString(), ward, latitude: lat, longitude: lon, data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: 'Live weather is temporarily unavailable. Check your connection and try again.', source: 'Open-Meteo', ward }, { status: 503 })
  }
}
