import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Upload a strip image first.' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image uploads are supported.' }, { status: 415 })
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: 'Image must be smaller than 12 MB.' }, { status: 413 })
  const backend = process.env.HEATHEALTH_ML_API_URL
  if (!backend) return NextResponse.json({ error: 'Urine detector is not connected yet. Configure HEATHEALTH_ML_API_URL and run the included ML service, or use the clearly labelled synthetic demo result.' }, { status: 503 })
  try {
    const forwarded = new FormData()
    forwarded.append('file', file, file.name || 'strip-image.jpg')
    const response = await fetch(`${backend.replace(/\/$/, '')}/analyze`, { method: 'POST', body: forwarded, signal: AbortSignal.timeout(30000) })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'The ML service could not be reached. Check that the local FastAPI service is running and HEATHEALTH_ML_API_URL is correct.' }, { status: 503 })
  }
}
