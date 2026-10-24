'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PortalShell } from '@/components/PortalShell'
import StaticMap from '@/components/StaticMap'
import { PageTitle } from '@/components/Widgets'
import PersonalizedWeatherPanel from '@/components/PersonalizedWeatherPanel'
import { createClient } from '@/lib/supabase/client'
import { Activity, ArrowRight, Droplets, HeartPulse, Hospital, MapPin, Phone, ScanLine, Sun } from 'lucide-react'

export default function Citizen() {
  const [ml, setMl] = useState(0)
  const [target, setTarget] = useState(2500)
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => { (async () => {
    try {
      const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) return
      setSignedIn(true)
      const start = new Date(); start.setHours(0,0,0,0)
      const { data: logs } = await s.from('hydration_logs').select('amount_ml').eq('user_id',user.id).gte('logged_at',start.toISOString())
      const { data: p } = await s.from('citizen_profiles').select('hydration_target_liters').eq('user_id',user.id).maybeSingle()
      setMl((logs || []).reduce((a:number,b:any)=>a+Number(b.amount_ml||0),0)); if(p?.hydration_target_liters) setTarget(Number(p.hydration_target_liters)*1000)
    } catch { /* demo session has no personal hydration history */ }
  })() }, [])
  const add = async () => { try { const s=createClient(); const {data:{user}}=await s.auth.getUser(); if(!user) return; const {error}=await s.from('hydration_logs').insert({user_id:user.id,amount_ml:250}); if(!error)setMl(x=>x+250) } catch {} }
  const pct = Math.min(100,Math.round(ml/target*100))
  return <PortalShell type="citizen"><PageTitle eyebrow="Citizen heat-health workspace" title="Your heat picture, not a generic warning." desc="Live forecast for a selected Mumbai ward, a personalised prototype risk estimate, hydration tracking and access to nearby support." action={<Link href="/citizen/checkin" className="btn btn-dark">Update how I feel <Activity size={16}/></Link>}/>
    <div className="space-y-5"><PersonalizedWeatherPanel/>
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="card p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-forest"><Droplets/></span><div><p className="font-extrabold text-forest">Hydration rhythm</p><p className="text-xs text-slate-500">{signedIn?'Logged to your Supabase account':'Demo view · sign in to save hydration logs'}</p></div></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="mono text-4xl font-bold text-forest">{(ml/1000).toFixed(2)} L</p><p className="text-xs text-slate-500">logged today · target {(target/1000).toFixed(1)} L</p></div><button onClick={add} disabled={!signedIn} className="btn btn-dark !min-h-10 !px-4 disabled:cursor-not-allowed disabled:opacity-40">+250 ml</button></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-600 transition-all" style={{width:`${pct}%`}}/></div><p className="mt-3 text-xs text-slate-500">Follow your clinician's advice for fluid intake, especially if you have a condition requiring fluid restriction.</p></div>
        <div className="card p-6"><div className="flex items-start gap-3"><HeartPulse className="mt-1 text-orange-500"/><div><p className="font-extrabold text-forest">When to seek help</p><p className="mt-1 text-sm leading-6 text-slate-600">Move to a cooler place and stop strenuous activity if you feel unwell in the heat. Do not wait for a urine-strip result if symptoms are severe.</p></div></div><div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-orange-950"><b>Emergency warning:</b> confusion, collapse, seizures, fainting, severe breathing difficulty or rapidly worsening symptoms need urgent medical attention. Call 112 in India.</div><div className="mt-4 flex flex-wrap gap-2"><a href="tel:112" className="btn btn-dark"><Phone size={15}/> Emergency help</a><Link href="/citizen/nearby" className="btn btn-light"><Hospital size={15}/> Find nearby care</Link></div></div>
      </div>
      <div className="card overflow-hidden p-3"><div className="flex items-center justify-between gap-3 px-3 py-3"><div><p className="font-extrabold text-forest">Mumbai ward boundaries</p><p className="text-xs text-slate-500">Ward boundaries from the supplied GeoJSON; facility data still needs verification</p></div><Link href="/citizen/nearby" className="text-sm font-bold text-green-700">Nearby resources <ArrowRight size={14} className="inline"/></Link></div><StaticMap height="400px"/></div>
      <div className="grid gap-4 md:grid-cols-3"><ActionCard href="/citizen/screening" icon={ScanLine} title="Urine-strip screening" desc="Upload/capture a strip image for pad detection or use a clearly labelled synthetic demo."/><ActionCard href="/citizen/checkin" icon={Activity} title="Health check-in" desc="Update symptoms and exposure to refine the personalised estimate."/><ActionCard href="/citizen/profile" icon={Sun} title="My heat profile" desc="Review baseline, exposure and hydration preferences."/></div>
    </div>
  </PortalShell>
}
function ActionCard({href,icon:Icon,title,desc}:{href:string,icon:any,title:string,desc:string}) { return <Link href={href} className="card group p-5 hover:border-green-300"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-forest"><Icon/></span><h3 className="mt-4 font-extrabold text-forest">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{desc}</p><ArrowRight size={16} className="mt-4 text-green-600 transition group-hover:translate-x-1"/></Link> }
