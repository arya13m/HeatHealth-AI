'use client'
import { useEffect, useRef } from 'react'
import wardGeoJSON from '@/data/mumbai-wards-geojson.json'
export default function StaticMap({height='360px',compact=false}:{height?:string,compact?:boolean}) {
  const ref=useRef<HTMLDivElement>(null); const mapRef=useRef<any>(null)
  useEffect(()=>{let disposed=false;let cleanup:(()=>void)|undefined;(async()=>{try{
    const L=(await import('leaflet')).default;if(disposed||!ref.current)return
    if(mapRef.current){mapRef.current.remove();mapRef.current=null}
    const map=L.map(ref.current,{center:[19.076,72.8777],zoom:11,zoomControl:!compact,scrollWheelZoom:!compact,attributionControl:true});mapRef.current=map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map)
    const wards=L.geoJSON(wardGeoJSON as any,{style:()=>({color:'#37745b',weight:1.2,fillColor:'#b7d8a0',fillOpacity:.16}),onEachFeature:(feature:any,layer:any)=>{const p=feature.properties||{};const name=String(p.Name_1||'Mumbai ward');const ward=String(p.WardID||p.WardNumber||'');const population=Number(p.Population||0);layer.bindPopup(`<b>Ward ${ward} · ${name}</b><br/>Population (source attribute): ${population?population.toLocaleString('en-IN'):'not supplied'}<br/><small>Boundary from supplied Mumbai wards GeoJSON. Weather is fetched separately for a representative point.</small>`);layer.bindTooltip(`Ward ${ward} · ${name}`,{sticky:true})}}).addTo(map)
    try{map.fitBounds(wards.getBounds(),{padding:[12,12]})}catch{}
    L.circleMarker([19.076,72.8777],{radius:7,color:'#0f3d2e',fillColor:'#d9f99d',fillOpacity:1,weight:3}).addTo(map).bindPopup('<b>Mumbai city-centre reference point</b><br/>Forecast point only; choose a ward in the weather panel for its representative forecast.')
    setTimeout(()=>map.invalidateSize(),80);cleanup=()=>{if(mapRef.current===map){map.remove();mapRef.current=null}}
  }catch{if(!disposed&&ref.current){ref.current.innerHTML='<div class="grid h-full place-items-center bg-slate-50 p-6 text-center text-sm text-slate-500"><div><b class="block text-forest">Map preview unavailable</b><span>Check your connection and reload.</span></div></div>'}}})();return()=>{disposed=true;cleanup?.();if(mapRef.current){mapRef.current.remove();mapRef.current=null}}},[compact])
  return <div ref={ref} style={{height}} className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100"/>
}
