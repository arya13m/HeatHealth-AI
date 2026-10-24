import Link from 'next/link'
import { PortalShell } from '@/components/PortalShell'
import { PageTitle } from '@/components/Widgets'
import UrineStripScanner from '@/components/UrineStripScanner'
export default function DoctorScan(){return <PortalShell type="doctor"><div className="max-w-6xl"><PageTitle eyebrow="Clinical image review · prototype" title="Scan a urine strip." desc="Detect strip and pad locations, inspect raw colour features, and record any manually verified manufacturer-chart readings. Do not treat automated detections as clinical results." action={<Link href="/doctor/screening" className="btn btn-light">← Screening queue</Link>}/><UrineStripScanner role="doctor"/></div></PortalShell>}
