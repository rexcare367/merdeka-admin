'use client'

import FullLogo from '@/app/(DashboardLayout)/layout/shared/logo/FullLogo'
import CardBox from '../shared/CardBox'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState, type FormEvent } from 'react'

export const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
        }),
      })
      const data = (await res.json()) as { error?: string; message?: string }

      if (!res.ok) {
        setError(data.error ?? 'Registration failed.')
        return
      }

      setSuccess(
        data.message ??
          'Registration successful. You can sign in now.'
      )
      setPassword('')
      setConfirmPassword('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
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
                Create an admin account
              </p>
              {success ? (
                <p className='text-sm text-green-700 text-center mb-4' role='status'>
                  {success}
                </p>
              ) : null}
              {error ? (
                <p className='text-sm text-red-600 text-center mb-4' role='alert'>
                  {error}
                </p>
              ) : null}
              <div>
                <div className='mb-2 block'>
                  <Label htmlFor='name' className='font-medium'>
                    Name
                  </Label>
                </div>
                <Input
                  id='name'
                  name='name'
                  type='text'
                  autoComplete='name'
                  placeholder='Your name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className='mt-4'>
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
              <div className='mt-4'>
                <div className='mb-2 block'>
                  <Label htmlFor='password' className='font-medium'>
                    Password
                  </Label>
                </div>
                <Input
                  id='password'
                  name='password'
                  type='password'
                  autoComplete='new-password'
                  placeholder='At least 8 characters'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className='mt-4'>
                <div className='mb-2 block'>
                  <Label htmlFor='confirmPassword' className='font-medium'>
                    Confirm password
                  </Label>
                </div>
                <Input
                  id='confirmPassword'
                  name='confirmPassword'
                  type='password'
                  autoComplete='new-password'
                  placeholder='Repeat your password'
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button className='w-full mt-6' type='submit' disabled={pending}>
                {pending ? 'Creating account…' : 'Sign up'}
              </Button>
              <div className='flex items-center gap-2 justify-center mt-6 flex-wrap'>
                <p className='text-base font-medium text-link dark:text-darklink'>
                  Already have an account?
                </p>
                <Link
                  href='/auth/login'
                  className='text-sm font-medium text-primary hover:text-primaryemphasis'>
                  Sign In
                </Link>
              </div>
            </form>
          </CardBox>
        </div>
      </div>
    </>
  )
}
