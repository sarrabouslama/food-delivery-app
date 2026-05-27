// src/pages/AuthPages.tsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Utensils, ShoppingBag, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── Background ───────────────────────────────────────────────────────────────

const AuroraBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute w-[600px] h-[600px] rounded-full bg-[rgba(184,200,255,0.4)] blur-[100px] -top-36 -left-24 animate-blob-float" />
    <div className="absolute w-[500px] h-[500px] rounded-full bg-[rgba(212,170,255,0.35)] blur-[100px] -bottom-24 -right-20 animate-[blob-float_12s_ease-in-out_infinite_2s]" />
    <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(255,179,217,0.28)] blur-[80px] top-1/2 left-1/2 -translate-x-1/2 animate-[blob-float_9s_ease-in-out_infinite_1s]" />
    <div className="absolute w-[320px] h-[320px] rounded-full bg-[rgba(168,230,207,0.2)] blur-[80px] bottom-1/4 left-1/4 animate-[blob-float_14s_ease-in-out_infinite_3s]" />
  </div>
)

// ─── Logo ─────────────────────────────────────────────────────────────────────

const Logo = () => (
  <div className="flex flex-col items-center gap-1 mb-6">
    <span className="font-display font-light text-4xl tracking-tight text-[#1e1b4b]">
      MataamGo<span className="text-[#a855f7]">.</span>
    </span>
    <p className="text-xs text-[#7c6fad] tracking-widest uppercase">food delivery, elevated</p>
  </div>
)

// ─── Divider ─────────────────────────────────────────────────────────────────

const Divider = ({ label }: { label: string }) => (
  <div className="relative flex items-center my-5">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#a855f7]/20 to-transparent" />
    <span className="px-3 text-xs text-[#7c6fad]">{label}</span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#a855f7]/20 to-transparent" />
  </div>
)

// ─── Field wrapper ────────────────────────────────────────────────────────────

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
)

// ─── Login Page ───────────────────────────────────────────────────────────────

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { addToast('error', 'Please fill in all fields'); return }
    setLoading(true)
    try {
      await login(email, password)
      addToast('success', 'Welcome back!')
      navigate('/dashboard')
    } catch (err: unknown) {
      addToast('error', 'Login failed', err instanceof Error ? err.message : 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative">
      <AuroraBackground />

      <div className="w-full max-w-md animate-fade-in">
        <Logo />

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to continue ordering</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Email address" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  leftIcon={<Mail size={16} />}
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  leftIcon={<Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="cursor-pointer hover:text-[#4c3d8f] transition-colors"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </Field>

              <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </form>

            <Divider label="new here?" />

            <p className="text-center text-sm text-[#7c6fad]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#a855f7] font-medium hover:text-[#7c3aed] transition-colors underline underline-offset-2">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Demo hint */}
        <p className="text-center text-xs text-[#7c6fad]/70 mt-4">
          Demo: <span className="font-mono">customer@test.com</span> · <span className="font-mono">password123</span>
        </p>
      </div>
    </div>
  )
}

// ─── Register Page ────────────────────────────────────────────────────────────

export const RegisterPage: React.FC = () => {
  const { register } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [role, setRole] = useState<'customer' | 'restaurant'>('customer')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { addToast('error', 'Please fill in all fields'); return }
    if (password.length < 8) { addToast('error', 'Password too short', 'Must be at least 8 characters'); return }
    setLoading(true)
    try {
      await register(name, email, password, role)
      addToast('success', 'Account created!', 'Welcome to MataamGo')
      navigate('/dashboard')
    } catch (err: unknown) {
      addToast('error', 'Registration failed', err instanceof Error ? err.message : 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative">
      <AuroraBackground />

      <div className="w-full max-w-md animate-fade-in">
        <Logo />

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create account</CardTitle>
            <CardDescription>Join MataamGo and start ordering</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Full name" htmlFor="name">
                <Input
                  id="name"
                  type="text"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  leftIcon={<User size={16} />}
                />
              </Field>

              <Field label="Email address" htmlFor="reg-email">
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  leftIcon={<Mail size={16} />}
                />
              </Field>

              <Field label="Password" htmlFor="reg-password">
                <Input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  leftIcon={<Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="cursor-pointer hover:text-[#4c3d8f] transition-colors"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                {password.length > 0 && (
                  <div className="mt-1.5 flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 h-1 rounded-full transition-all duration-300',
                          password.length === 0 ? 'bg-[#e5e0ff]' :
                          i === 0 && password.length >= 1 ? 'bg-red-400' :
                          i === 1 && password.length >= 4 ? 'bg-orange-400' :
                          i === 2 && password.length >= 8 ? 'bg-yellow-400' :
                          i === 3 && password.length >= 12 ? 'bg-green-400' :
                          'bg-[#e5e0ff]',
                        )}
                      />
                    ))}
                  </div>
                )}
              </Field>

              {/* Role selector */}
              <div className="flex flex-col gap-2">
                <Label>I am a</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'customer', icon: ShoppingBag, label: 'Customer', desc: 'Order food' },
                    { value: 'restaurant', icon: Utensils, label: 'Restaurant', desc: 'Receive orders' },
                  ] as const).map(({ value, icon: Icon, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer',
                        role === value
                          ? 'border-[#a855f7] bg-gradient-to-b from-[#a855f7]/10 to-[#6b8fff]/10 shadow-md shadow-violet-200'
                          : 'border-white/40 bg-white/40 hover:border-[#a855f7]/40 hover:bg-white/60',
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                        role === value
                          ? 'bg-gradient-to-br from-[#6b8fff] to-[#a855f7] text-white shadow-lg shadow-violet-300/40'
                          : 'bg-white/60 text-[#7c6fad]',
                      )}>
                        <Icon size={20} />
                      </div>
                      <div className="text-center">
                        <p className={cn('text-sm font-medium', role === value ? 'text-[#1e1b4b]' : 'text-[#4c3d8f]')}>{label}</p>
                        <p className="text-[10px] text-[#7c6fad]">{desc}</p>
                      </div>
                      {role === value && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#a855f7]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create account <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </form>

            <Divider label="already a member?" />

            <p className="text-center text-sm text-[#7c6fad]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#a855f7] font-medium hover:text-[#7c3aed] transition-colors underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
