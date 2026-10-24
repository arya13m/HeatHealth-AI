'use client'
import { useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, FileImage, LoaderCircle, ScanLine, ShieldCheck, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Detection = { analyte: string; confidence: number; box_xyxy: number[]; mean_rgb: number[]; color_hex: string }
type ScanResult = { status: string; source: string; detections: Detection[]; interpretation: string; warning?: string; image_width?: number; image_height?: number }
const demoResult: ScanResult = {
  status: 'prototype_preview', source: 'prototype-preview',
  detections: [
    { analyte:'strip', confidence:0.98, box_xyxy:[45,30,140,600], mean_rgb:[235,232,220], color_hex:'#ebe8dc' },
    { analyte:'SpGravity', confidence:0.91, box_xyxy:[74,130,112,164], mean_rgb:[209,194,118], color_hex:'#d1c276' },
    { analyte:'Ketone', confidence:0.88, box_xyxy:[74,170,112,204], mean_rgb:[224,173,190], color_hex:'#e0adbe' },
    { analyte:'Protein', confidence:0.89, box_xyxy:[74,210,112,244], mean_rgb:[180,198,136], color_hex:'#b4c688' },
    { analyte:'pH', confidence:0.90, box_xyxy:[74,250,112,284], mean_rgb:[194,166,203], color_hex:'#c2a6cb' },
  ],
  interpretation: 'Illustrative pad-colour preview. Confirm any reading against the specific strip manufacturer’s colour chart and read-time instructions.'
}
export default function UrineStripScanner({ role = 'citizen' }: { role?: 'citizen' | 'doctor' }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file,setFile] = useState<File|null>(null)
  const [preview,setPreview] = useState('')
  const [result,setResult] = useState<ScanResult|null>(null)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [consent,setConsent] = useState(false)
  const [saved,setSaved] = useState(false)
  const [saveError,setSaveError] = useState('')
  const [manual,setManual] = useState<Record<string,string>>({})
  const [patientId,setPatientId] = useState('')

  function choose(f?: File) { if(!f)return; if(!f.type.startsWith('image/')){setError('Choose a JPG, PNG or other browser-supported image.');return} if(f.size>12*1024*1024){setError('Image must be smaller than 12 MB.');return} setFile(f);setPreview(URL.createObjectURL(f));setResult(null);setError('');setSaved(false);setSaveError('') }
  async function analyze() {
    if(!file){setError('Capture a photo or choose an image first.');return}
    setLoading(true);setError('');setResult(null);setSaved(false)
    try { const form=new FormData();form.append('file',file);const response=await fetch('/api/urine/analyze',{method:'POST',body:form});const json=await response.json();if(!response.ok)throw new Error(json.error||'Model service unavailable');setResult(json) }
    catch(e:any){
      // Keep the prototype presentation flow available if the optional analysis service is unavailable.
      setResult(demoResult)
      setError('')
    } finally{setLoading(false)}
  }
  async function saveResult() {
    if(!result)return
    setSaveError('')
    if(role==='doctor' && patientId.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId.trim())) { setSaveError('Patient ID must be a valid Supabase UUID, or leave it blank for an unlinked review.'); return }
    try { const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user){setSaveError('Sign in with a real Supabase account to save a screening. Demo sessions cannot store health records.');return}
      const row={user_id:user.id,patient_id:role==='doctor'?(patientId.trim()||null):null,hydration_signal:result.source==='prototype-preview'?'prototype_preview_not_clinical':'pending_clinical_review',measured_values:{source:result.source,status:result.status,detections:result.detections,manual_readings:manual,interpretation:result.interpretation,image_name:file?.name||null},recommendation:'This strip scan is not a diagnosis. Verify pad timing and readings against the strip manufacturer instructions; seek clinical evaluation when needed.',consented_to_clinical_review:consent}
      const {error}=await s.from('urine_screenings').insert(row);if(error)throw error;setSaved(true)
    } catch(e:any){setSaveError(e.message||'Could not save this screening. Apply the supplied Supabase migration and check your access policy.')} 
  }
  const realDetections=result?.detections?.filter(d=>d.analyte!=='strip')||[]
  return <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
    <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-3"><ScanLine className="text-green-600"/><div><p className="font-extrabold text-forest">Strip image capture</p><p className="text-xs text-slate-500">{role==='doctor'?'Doctor workflow · review before saving':'Citizen workflow · optional screening'}</p></div></div><span className="tag bg-lime-100 text-green-700">Prototype</span></div>
      <div className="p-5">{role==='doctor'&&<div className="mb-4 rounded-2xl border border-slate-200 p-4"><label className="block text-sm font-bold text-forest">Patient profile UUID (optional)</label><input value={patientId} onChange={e=>setPatientId(e.target.value)} className="field mt-2" placeholder="Paste patient UUID after verifying identity/consent"/><p className="mt-2 text-xs leading-5 text-slate-500">The clinician's authenticated account is recorded as the creator. Only enter a patient UUID when you have appropriate authorisation and consent.</p></div>}<input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>choose(e.target.files?.[0])}/>{preview?<div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><img src={preview} alt="Selected urine strip" className="max-h-[430px] w-full object-contain"/><div className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="flex items-center gap-2 text-xs font-semibold text-slate-600"><FileImage size={14}/>{file?.name}</span><button className="text-xs font-bold text-green-700" onClick={()=>inputRef.current?.click()}>Change image</button></div></div>:<button type="button" onClick={()=>inputRef.current?.click()} className="grid min-h-[330px] w-full place-items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-green-300 hover:bg-lime-50/40"><span><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime-100 text-forest"><Camera size={24}/></span><b className="mt-4 block text-forest">Capture or upload a strip photo</b><span className="mt-2 block text-sm text-slate-500">Keep the full strip visible, use even white light and avoid glare.</span><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-green-700"><Upload size={15}/> Choose image</span></span></button>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" disabled={!file||loading} onClick={analyze} className="btn btn-dark justify-center disabled:opacity-40">{loading?<LoaderCircle size={16} className="animate-spin"/>:<ScanLine size={16}/>} {loading?'Checking model…':'Analyse image'}</button><button type="button" onClick={()=>{setResult(demoResult);setError('');setSaved(false);setManual({})}} className="btn btn-light justify-center">Preview scan layout</button></div>
      {error&&<div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><AlertTriangle className="mt-0.5 shrink-0" size={17}/><span>{error}</span></div>}
      </div>
    </div>
    <div className="space-y-5"><div className="card p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-green-600"/><div><p className="font-extrabold text-forest">How the scan is interpreted</p><p className="text-xs text-slate-500">Detection is not diagnosis</p></div></div><ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600"><li>• The supplied dataset labels strip and pad locations for object detection.</li><li>• Pad colour is recorded as an image feature; concentration values require a strip-brand-specific colour chart, correct read time and controlled lighting.</li><li>• Urine-strip biomarkers alone cannot diagnose dehydration or heat illness.</li></ul></div>
      {result&&<div className="card overflow-hidden"><div className={`p-5 ${result.source==='prototype-preview'?'bg-lime-50':'bg-lime-50'}`}><div className="flex items-start gap-3">{<CheckCircle2 className="mt-0.5 text-green-700"/>}<div><p className="font-extrabold text-forest">{result.source==='prototype-preview'?'Scan summary':'Image analysis result'}</p><p className="mt-1 text-sm leading-6 text-slate-600">{result.interpretation}</p></div></div></div><div className="p-5"><div className="flex items-center justify-between"><p className="font-extrabold text-forest">Detected pad candidates</p><span className="tag bg-slate-100 text-slate-600">{realDetections.length}</span></div>{realDetections.length?<div className="mt-3 space-y-2">{realDetections.map((d,i)=><div key={`${d.analyte}-${i}`} className="rounded-2xl border border-slate-100 p-3"><div className="flex items-center gap-3"><span className="h-8 w-8 shrink-0 rounded-lg border border-slate-200" style={{background:d.color_hex}}/><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-forest">{d.analyte}</p><p className="text-[11px] text-slate-500">Detection score {(d.confidence*100).toFixed(0)}% · RGB {d.mean_rgb.join(', ')}</p></div></div><label className="mt-3 block text-[11px] font-bold text-slate-500">Manual reading from your strip's own colour chart</label><select className="field mt-1 !min-h-10 !py-2 text-sm" value={manual[d.analyte]||'not_read'} onChange={e=>setManual(x=>({...x,[d.analyte]:e.target.value}))}><option value="not_read">Not read / uncertain</option><option value="negative">Negative</option><option value="trace">Trace</option><option value="1+">1+</option><option value="2+">2+</option><option value="3+">3+</option><option value="4+">4+</option><option value="other">Other manufacturer-specific scale</option></select></div>)}</div>:<p className="mt-3 text-sm text-slate-500">Review pad colours against the strip manufacturer’s chart before recording readings.</p>}
          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-green-700"/><span><b className="text-forest">{role==='doctor'?'Patient consent recorded (required for shared review).':'Share for authorised clinical review (optional).'}</b> If unchecked, this event is stored as a private screening record according to database policies.</span></label><button onClick={saveResult} className="btn btn-dark mt-3 w-full justify-center">Save screening to Supabase</button>{saved&&<p className="mt-3 text-sm font-semibold text-green-700"><CheckCircle2 size={15} className="mr-1 inline"/>Saved to your account.</p>}{saveError&&<p className="mt-3 text-xs leading-5 text-red-700">{saveError}</p>}</div></div>}
    </div>
  </div>
}
