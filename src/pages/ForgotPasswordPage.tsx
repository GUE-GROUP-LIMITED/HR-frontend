import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Loader2, MailCheck } from 'lucide-react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      await api.auth.forgotPassword(email.trim())
      setMessage('If the account exists, a password reset email has been sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request password reset')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Reset password</h1>
            <p className="text-xs text-slate-500">Request a secure reset link</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Work email
            <Input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@guegroup.com"
              className="mt-1"
            />
          </label>

          {message && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            Send reset link
          </Button>
        </form>

        <div className="mt-5 text-center text-xs">
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
