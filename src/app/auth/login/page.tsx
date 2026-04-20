import { Suspense } from 'react'
import { Login } from '@/app/components/auth/login'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  )
}