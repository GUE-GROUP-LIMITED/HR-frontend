import React, { useState, useEffect } from 'react'
import { Send, Globe, Key, CheckCircle, Sparkles, AlertCircle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { Website, Category } from '@/types'
import { useNotifications } from '@/contexts/NotificationContext'
import { queryClient } from '@/lib/queryClient'
import confetti from 'canvas-confetti'

interface PublicIntakeModalProps {
  open: boolean
  onClose: () => void
}

export const PublicIntakeModal: React.FC<PublicIntakeModalProps> = ({ open, onClose }) => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [successResult, setSuccessResult] = useState<string | null>(null)
  const { refreshNotifications } = useNotifications()

  useEffect(() => {
    if (open) {
      api.websites.list().then((sites) => {
        setWebsites(sites)
        if (sites.length && !selectedWebsiteId) setSelectedWebsiteId(sites[0].id)
      })
      api.categories.list().then((cats) => {
        setCategories(cats)
        if (cats.length && !selectedCategoryId) setSelectedCategoryId(cats[0].id)
      })
    }
  }, [open])

  const selectedWebsite = websites.find((w) => w.id === selectedWebsiteId)

  // Pre-fill templates for fast testing
  const applyTemplate = (type: 'career' | 'business' | 'tech' | 'billing') => {
    if (type === 'career') {
      setSelectedWebsiteId('w3')
      setSelectedCategoryId('c3')
      setName('Maya Angelou')
      setEmail('maya.angelou@creative-talent.org')
      setPhone('+1 (312) 555-8821')
      setSubject('Senior UX Designer Portfolio & Application')
      setMessage('Hello HR Team, I recently applied for the Senior UX Designer role on your careers portal. Here is a link to my case studies and design system documentation.')
    } else if (type === 'business') {
      setSelectedWebsiteId('w2')
      setSelectedCategoryId('c2')
      setName('Kenji Tanaka')
      setEmail('k.tanaka@tokyo-ventures.jp')
      setPhone('+81 3 5555 0142')
      setSubject('Cross-Border Distribution Partnership')
      setMessage('Dear GUE Commerce team, We represent 45 retail concept outlets in Japan and wish to discuss distributing GUE curated hardware lines.')
    } else if (type === 'tech') {
      setSelectedWebsiteId('w4')
      setSelectedCategoryId('c4')
      setName('Jordan Lee')
      setEmail('jordan@stackstream.dev')
      setPhone('+1 (650) 555-9081')
      setSubject('REST API v1 Rate Limit Inquiries on High-Concurrency Clusters')
      setMessage('We are noticing burst thresholds being throttled at 1,000 req/min instead of 5,000 req/min on our enterprise dev tier.')
    } else if (type === 'billing') {
      setSelectedWebsiteId('w1')
      setSelectedCategoryId('c5')
      setName('Elena Rostova Client Rep')
      setEmail('finance@acme-corp.com')
      setSubject('Tax Identification & Wire Reconciliation')
      setMessage('Kindly furnish the signed W-8BEN-E or VAT certificates for upcoming Q4 enterprise retainers.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !subject || !message) return

    setLoading(true)
    try {
      const res = await api.publicIntake.submit({
        name,
        email,
        phone,
        subject,
        message,
        category: selectedCategoryId,
        website_key: selectedWebsite?.site_key,
      })

      setSuccessResult(res.message_id)
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      })

      // Invalidate message queries and notifications
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
      refreshNotifications()

      setTimeout(() => {
        setSuccessResult(null)
        onClose()
        setName('')
        setEmail('')
        setPhone('')
        setSubject('')
        setMessage('')
      }, 1600)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Public Contact Intake Simulator"
      description="Simulate external visitor messages submitted from any of the 4 company websites."
      maxWidth="2xl"
    >
      {successResult ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 animate-bounce">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">HTTP 201 Created!</h3>
          <p className="text-sm text-slate-600 mt-1">
            Message registered with ID: <span className="font-mono font-bold">{successResult}</span>
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Dispatched to GUE HR Unified Inbox and auto-routed according to category rules.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Quick Presets
              </span>
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyTemplate('career')}
                className="px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors text-left truncate"
              >
                Careers Inquiry
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('business')}
                className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors text-left truncate"
              >
                Partnership Pitch
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('tech')}
                className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors text-left truncate"
              >
                API Support Bug
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('billing')}
                className="px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors text-left truncate"
              >
                Billing & Invoice
              </button>
            </div>
          </div>

          {/* Website Selection & Site Key */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Simulated Origin Website
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {websites.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWebsiteId(w.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                      selectedWebsiteId === w.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="overflow-hidden">
                      <p className="truncate">{w.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{w.domain}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated HTTP Header X-Site-Key */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-[11px] font-mono text-slate-500">
              <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Header:</span>
              <code className="bg-slate-200/70 px-2 py-0.5 rounded text-[10px] text-slate-800 truncate">
                X-Site-Key: {selectedWebsite?.site_key || 'generating...'}
              </code>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sender Full Name *
              </label>
              <Input
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sender Email *
              </label>
              <Input
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (optional)
              </label>
              <Input
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message Category *
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.default_assignee_name ? `(Auto-assign: ${c.default_assignee_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Line *
            </label>
            <Input
              placeholder="Inquiry regarding..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message Body *
            </label>
            <textarea
              rows={4}
              placeholder="Write inquiry message text here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Send className="h-4 w-4" />
              <span>{loading ? 'Submitting to /public/contact...' : 'Send Message'}</span>
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

