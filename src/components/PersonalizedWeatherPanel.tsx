'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CloudSun, Droplets, LoaderCircle, MapPin, RefreshCw, Sun, Thermometer, Wind } from 'lucide-react'
import wards from '@/data/mumbai-wards.json'
import nasaBaseline from '@/data/nasa-power-monthly-baseline.json'
import { createClient } from '@/lib/supabase/client'
import { scorePersonalRisk } from '@/lib/riskModel'

type WeatherPayload = {
  source: string; fetched_at: string; ward: string; data: {
    current: { time: string; temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; precipitation: number; wind_speed_10m: number }
    hourly: { time: string[]; temperature_2m: number[]; apparent_temperature: number[]; relative_humidity_2m: number[]; uv_index: number[]; precipitation_probability: number[] }
    daily: { time: string[]; temperature_2m_max: number[]; apparent_temperature_max: number[]; uv_index_max: number[]; sunrise: string[]; sunset: string[]; precipitation_probability_max: number[] }
  }
}
const city = { ward_id: 'MUM', name: 'Mumbai city centre', population: null as number | null, lat: 19.0760, lon: 72.8777 }

export default function PersonalizedWeatherPanel({ compact = false, showPersonalScore = true }: { compact?: boolean; showPersonalScore?: boolean }) {
  const [selected, setSelected] = useState('MUM')
  const [weather, setWeather] = useState<WeatherPayload | null>(null)
  const [profile, setProfile] = useState<Record<string, any>>({ age: 30, activity_level: 'Mostly indoors', heat_exposure: [], water_intake_liters: 2, symptoms: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const area = useMemo(() => selected === 'MUM' ? city : wards.find((w: any) => w.ward_id === selected) || city, [selected])

  const loadWeather = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/weather?lat=${area.lat}&lon=${area.lon}&ward=${encodeURIComponent(area.name)}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Weather unavailable')
      setWeather(json)
    } catch (e: any) { setError(e.message || 'Live weather is temporarily unavailable'); setWeather(null) }
    finally { setLoading(false) }
  }, [area])

  useEffect(() => { void loadWeather() }, [loadWeather])
  useEffect(() => { const timer = window.setInterval(() => { void loadWeather() }, 10 * 60 * 1000); return () => window.clearInterval(timer) }, [loadWeather])
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const s = createClient()
        const { data: { user } } = await s.auth.getUser()
        if (!active || !user) return
        const m = user.user_metadata || {}
        setProfile({ age: m.age || 30, activity_level: m.activity_level || 'Mostly indoors', heat_exposure: m.heat_exposure || [], water_intake_liters: m.water_intake_liters || 2, symptoms: m.symptoms || {} })
      } catch { /* score uses the explicit demo baseline when auth is unavailable */ }
    })()
    return () => { active = false }
  }, [])

  const current = weather?.data.current
  const risk = current ? scorePersonalRisk(current.apparent_temperature, current.relative_humidity_2m, profile) : null
  const now = current?.time ? new Date(current.time).getTime() : Date.now()
  const upcoming = weather?.data.hourly.time.map((t, i) => ({ t, i })).filter(x => new Date(x.t).getTime() >= now).slice(0, 6) || []
  const daily = weather?.data.daily
  const baseline = nasaBaseline.months.find((m: any) => m.month === new Date().getMonth() + 1)

  return <section className="card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-forest"><CloudSun size={21}/></span><div><p className="font-extrabold text-forest">Live heat & weather</p><p className="text-xs text-slate-500">Forecast for Mumbai wards · Open-Meteo</p></div></div>
      <div className="flex items-center gap-2"><label className="sr-only" htmlFor="weather-ward">Choose ward</label><select id="weather-ward" className="field !min-h-10 !w-auto min-w-[165px] !py-2 text-xs" value={selected} onChange={e => setSelected(e.target.value)}><option value="MUM">Mumbai city centre</option>{wards.map((w: any) => <option key={w.ward_id} value={w.ward_id}>Ward {w.ward_id} · {w.name}</option>)}</select><button type="button" onClick={() => void loadWeather()} aria-label="Refresh weather" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-green-300"><RefreshCw size={15}/></button></div>
    </div>
    {loading ? <div className="flex items-center gap-3 p-8 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/> Fetching current conditions and forecast…</div> : error || !current ? <div className="p-6"><div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div><b>Live weather unavailable</b><p className="mt-1">{error || 'No forecast returned.'} No placeholder weather is shown as live data.</p></div></div></div> : <>
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className={`rounded-3xl bg-[#0b3b2c] p-5 text-white ${!showPersonalScore ? 'sm:col-span-2' : ''}`}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.15em] text-lime-200">Current conditions</span><MapPin size={16} className="text-white/60"/></div><p className="mt-3 text-sm text-white/65">{area.name}</p><div className="mt-1 flex items-end gap-3"><p className="display text-5xl font-extrabold">{Math.round(current.temperature_2m)}°</p><p className="pb-1 text-sm text-white/65">Feels like {Math.round(current.apparent_temperature)}°C</p></div><div className="mt-5 grid grid-cols-3 gap-2"><Mini icon={<Droplets size={14}/>} label="Humidity" value={`${Math.round(current.relative_humidity_2m)}%`}/><Mini icon={<Wind size={14}/>} label="Wind" value={`${Math.round(current.wind_speed_10m)} km/h`}/><Mini icon={<Thermometer size={14}/>} label="Rain" value={`${current.precipitation} mm`}/></div><p className="mt-4 text-[10px] text-white/45">Updated {new Date(weather.fetched_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})} · Asia/Kolkata</p></div>
        {showPersonalScore && <div className="rounded-3xl border border-slate-100 p-5"><div className="flex items-center justify-between"><p className="font-extrabold text-forest">Personalised heat-risk score</p><span className={`tag ${risk!.score >= 75 ? 'bg-red-100 text-red-700' : risk!.score >= 55 ? 'bg-orange-100 text-orange-700' : risk!.score >= 30 ? 'bg-amber-100 text-amber-800' : 'bg-lime-100 text-green-700'}`}>{risk!.band}</span></div><div className="mt-4 flex items-end gap-2"><p className="display text-5xl font-extrabold text-forest">{risk!.score}</p><p className="pb-1 text-sm text-slate-400">/100 prototype score</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${risk!.score >= 75 ? 'bg-red-500' : risk!.score >= 55 ? 'bg-orange-500' : risk!.score >= 30 ? 'bg-amber-400' : 'bg-green-600'}`} style={{width:`${risk!.score}%`}}/></div><p className="mt-4 text-xs font-bold text-forest">Contributors from current inputs</p><ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-500">{risk!.reasons.slice(0,3).map(r => <li key={r}>• {r}</li>)}</ul></div>}
      </div>
      <div className="border-t border-slate-100 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="font-extrabold text-forest">Next hours</p><p className="text-xs text-slate-500">Apparent temperature and humidity</p></div><span className="tag bg-slate-100 text-slate-600">3-day forecast below</span></div><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{upcoming.map(({t,i})=><div key={t} className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{new Date(t).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}</p><p className="mono mt-2 text-lg font-bold text-forest">{Math.round(weather.data.hourly.apparent_temperature[i])}°</p><p className="mt-1 text-[10px] text-slate-500">RH {Math.round(weather.data.hourly.relative_humidity_2m[i])}%</p><p className="mt-1 text-[10px] text-orange-700">UV {Math.round(weather.data.hourly.uv_index[i] || 0)}</p></div>)}</div>
        {daily && <div className="mt-4 grid gap-2 sm:grid-cols-3">{daily.time.map((d,i)=><div key={d} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-xs"><span className="font-bold text-forest">{new Date(`${d}T12:00:00`).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span><span className="text-slate-500">High {Math.round(daily.temperature_2m_max[i])}° · feels {Math.round(daily.apparent_temperature_max[i])}°</span><span className="flex items-center gap-1 text-orange-700"><Sun size={13}/>{Math.round(daily.uv_index_max[i])}</span></div>)}</div>}
        {baseline && <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-extrabold text-forest">Historical climate context · NASA POWER / MERRA-2</p><p className="mt-1 text-xs leading-5 text-slate-600">For this month, the 2015–2025 regional-grid mean daily maximum was <b>{baseline.mean_daily_max_c}°C</b> (90th percentile {baseline.p90_daily_max_c}°C); mean relative humidity was {baseline.mean_relative_humidity_pct}%. This is a regional historical baseline, not a ward-specific station normal.</p></div>}
        {daily && <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 p-4"><p className="text-xs font-extrabold text-orange-950">IMD criteria reference · coastal station threshold</p><p className="mt-1 text-xs leading-5 text-orange-950">{daily.temperature_2m_max[0] >= 37 ? 'The forecast grid maximum reaches or exceeds 37°C, the coastal-station temperature threshold shown in the supplied IMD reference.' : 'The forecast grid maximum is below 37°C, the coastal-station temperature threshold shown in the supplied IMD reference.'} This is only a threshold comparison: it is not an official IMD warning. Formal heat-wave assessment also depends on station observations and departure from normal.</p></div>}
      </div>
      <div className="border-t border-amber-100 bg-amber-50/70 px-5 py-4 sm:px-6"><p className="text-[11px] leading-5 text-amber-950"><b>Important:</b> {showPersonalScore ? risk!.disclaimer : 'Weather exposure context is not an official IMD heatwave declaration or a health diagnosis. Confirm alerts with official sources.'} Weather is live forecast data. Seek urgent medical help for confusion, collapse, seizures or rapidly worsening symptoms.</p></div>
    </>}
  </section>
}
function Mini({icon,label,value}:{icon:React.ReactNode,label:string,value:string}) { return <div className="rounded-2xl bg-white/10 p-3"><span className="flex items-center gap-1 text-[10px] text-white/55">{icon}{label}</span><p className="mono mt-1 text-sm font-bold">{value}</p></div> }
