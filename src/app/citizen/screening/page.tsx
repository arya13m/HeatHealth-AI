import { PortalShell } from '@/components/PortalShell'
import { PageTitle } from '@/components/Widgets'
import UrineStripScanner from '@/components/UrineStripScanner'
export default function Screening(){return <PortalShell type="citizen"><div className="max-w-6xl"><PageTitle eyebrow="Optional screening · image analysis prototype" title="Urine-strip image screening." desc="Capture or upload a strip image. The detection service can locate reagent pads; clinical concentration readings require brand-specific calibration and review."/><UrineStripScanner role="citizen"/></div></PortalShell>}
