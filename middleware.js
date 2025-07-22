// middleware.ts
import { NextResponse } from 'next/server'

const rateLimitMap = new Map()

export async function middleware(req) {
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "unknown"
  const now = Date.now()

  const prev = rateLimitMap.get(ip) || []
  const recent = prev.filter(timestamp => now - timestamp < 60_000) // 1 minute

  if (recent.length > 10) {
    return new NextResponse("Too many requests", { status: 429 })
  }

  recent.push(now)
  rateLimitMap.set(ip, recent)

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/login'], // apply to login route
}
