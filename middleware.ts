import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const protectedPrefixes = ['/citizen','/doctor','/government','/staff']
const roleFor: Record<string,string> = { '/citizen':'citizen','/doctor':'doctor','/government':'government','/staff':'staff' }

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({request})
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll:(cookiesToSet)=>{
        cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value))
        response = NextResponse.next({request})
        cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))
      }
    }
  })
  const path = request.nextUrl.pathname
  const prefix = protectedPrefixes.find(p=>path===p || path.startsWith(p+'/'))
  if (!prefix) return response
  const demoRole = request.cookies.get('heathealth_demo_role')?.value
  const expectedDemo = roleFor[prefix]
  const demoEnabled = process.env.NODE_ENV !== 'production' && process.env.HEATHEALTH_DEMO_MODE === 'true'
  if (demoEnabled && demoRole && demoRole === expectedDemo) return response
  const {data:{user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  const {data:profile} = await supabase.from('profiles').select('role').eq('id',user.id).single()
  const expected = roleFor[prefix]
  if (!profile?.role) return NextResponse.redirect(new URL('/login?error=role_not_assigned', request.url))
  if (profile.role !== expected && profile.role !== 'admin') {
    const home = profile.role === 'doctor' ? '/doctor' : profile.role === 'government' ? '/government' : profile.role === 'staff' ? '/staff' : '/citizen'
    return NextResponse.redirect(new URL(home, request.url))
  }
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }
