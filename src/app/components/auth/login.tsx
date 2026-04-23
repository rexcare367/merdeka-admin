'use client'

import FullLogo from '@/app/(DashboardLayout)/layout/shared/logo/FullLogo'
import CardBox from '../shared/CardBox'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signIn, getSession } from 'next-auth/react'
import { useState, type FormEvent } from 'react'

export const Login = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })
    setPending(false)
    if (result?.error) {
      setError('Invalid email or password.')
      return
    }
    const session = await getSession()
    if (session?.accessToken) {
      try {
        sessionStorage.setItem('adminAccessToken', session.accessToken)
      } catch {
        /* ignore */
      }
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <>
      <div className='h-screen w-full flex justify-center items-center bg-lightprimary'>
        <div className='md:min-w-[450px] min-w-max'>
          <CardBox>
            <form onSubmit={handleSubmit}>
              <div className='flex justify-center mb-4'>
                <FullLogo />
              </div>
              <p className='text-sm text-charcoal text-center mb-6'>
                Admin sign in
              </p>
              {error ? (
                <p className='text-sm text-red-600 text-center mb-4' role='alert'>
                  {error}
                </p>
              ) : null}
              <div>
                <div className='mb-2 block'>
                  <Label htmlFor='email' className='font-medium'>
                    Email
                  </Label>
                </div>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  placeholder='admin@example.com'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className='mb-2 block'>
                  <Label htmlFor='password' className='font-medium'>
                    Password
                  </Label>
                </div>
                <Input
                  id='password'
                  name='password'
                  type='password'
                  autoComplete='current-password'
                  placeholder='Enter your password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className='flex flex-wrap gap-6 items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Checkbox id='remember' defaultChecked />
                  <Label
                    className='text-link font-normal text-sm'
                    htmlFor='remember'>
                    Remember this device
                  </Label>
                </div>
                <Link
                  href='#'
                  className='text-sm font-medium text-primary hover:text-primaryemphasis'>
                  Forgot Password ?
                </Link>
              </div>
              <Button className='w-full' type='submit' disabled={pending}>
                {pending ? 'Signing in…' : 'Sign In'}
              </Button>
              <div className='flex items-center gap-2 justify-center mt-6 flex-wrap'>
                <p className='text-base font-medium text-link dark:text-darklink'>
                  New to Merdeka Survey Admin?
                </p>
                <Link
                  href='/auth/register'
                  className='text-sm font-medium text-primary hover:text-primaryemphasis'>
                  Create an account
                </Link>
              </div>
            </form>
          </CardBox>
        </div>
      </div>
    </>
  )
}
