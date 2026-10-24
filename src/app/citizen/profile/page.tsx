'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {PortalShell} from '@/components/PortalShell'
import {UserRound,Sun,Droplets,Activity,Edit3,Loader2,Save} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'

export default function Profile(){
 const [p,setP]=useState<any>(null); const [user,setUser]=useState<any>(null); const [editing,setEditing]=useState(false); const [saving,setSaving]=useState(false);
 useEffect(()=>{(async()=>{const s=createClient(); const {data:{user}}=await s.auth.getUser(); setUser(user); if(user){const {data}=await s.from('citizen_profiles').select('*').eq('user_id',user.id).single(); setP(data)}})()},[])
 async function save(){if(!p||!user)return; setSaving(true); const s=createClient(); await s.from('citizen_profiles').update(p).eq('user_id',user.id); setSaving(false); setEditing(false)}
 if(!p)return <PortalShell type="citizen"><div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-green-600"/></div></PortalShell>
 return <PortalShell type="citizen">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-green-600">My heat profile · synced</p><h1 className="display mt-2 text-4xl font-extrabold text-forest">What the system knows about you.</h1><p className="mt-2 text-slate-500">Your profile drives personalisation. You can edit it anytime.</p></div><button onClick={()=>editing?save():setEditing(true)} className="btn btn-light">{saving?<Loader2 className="animate-spin"/>:editing?<Save size={15}/>:<Edit3 size={15}/>} {editing?'Save profile':'Edit profile'}</button></div>
  <div className="mt-7 grid gap-5 md:grid-cols-2"><Panel icon={UserRound} title="Baseline" rows={[`Name · ${user?.user_metadata?.full_name||'—'}`,`Age · ${p.age||'—'}`,`Location · ${p.locality||'—'}`,`Activity · ${p.activity_level||'—'}`]}/><Panel icon={Sun} title="Heat exposure" rows={[`Exposure factors · ${(p.heat_exposure||[]).join(', ')||'None selected'}`,`Cooling access · ${(p.heat_exposure||[]).includes('Limited access to cooling')?'Limited':'Available'}`,`Typical water · ${p.water_intake_liters||'—'} L`]}/><Panel icon={Droplets} title="Hydration" rows={[`Daily target · ${p.hydration_target_liters||2.5} L`,`Reminder mode · ${p.reminders_enabled?'Adaptive':'Off'}`,`Wake · ${p.wake_time||'—'}`,`Sleep · ${p.sleep_time||'—'}`]}/><Panel icon={Activity} title="Recent baseline" rows={Object.entries(p.symptoms||{}).map(([k,v])=>`${k} · ${String(v)}`)}/></div>
  <div className="mt-5 rounded-3xl bg-lime-50 p-6"><p className="font-extrabold text-forest">Personalisation principle</p><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">The platform uses your profile to explain why risk changes, not to label or diagnose you. Run another check-in whenever your routine or health context changes.</p><Link href="/citizen/checkin" className="mt-4 inline-flex font-bold text-green-700">Update my check-in →</Link></div>
 </PortalShell>
}
function Panel({icon:Icon,title,rows}:{icon:any,title:string,rows:string[]}){return <div className="card p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-100 text-forest"><Icon size={18}/></span><h2 className="font-extrabold text-forest">{title}</h2></div><div className="mt-5 space-y-2">{rows.map(x=><div key={x} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{x}</div>)}</div></div>}
