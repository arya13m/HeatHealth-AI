import type { Metadata } from 'next';
import './globals.css';
import HeatHealthChatbot from '@/components/HeatHealthChatbot';
export const metadata: Metadata={title:'HeatHealth AI | Heat-smart communities',description:'AI-assisted heat-health intelligence for citizens, clinicians, government and response teams.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/></head><body>{children}<HeatHealthChatbot /></body></html>}
