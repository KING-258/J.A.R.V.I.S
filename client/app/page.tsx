"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to auth page
    router.push("/auth")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold">J.A.R.V.I.S</h1>
        <p className="mt-2">Loading...</p>
      </div>
    </div>
  )
}
