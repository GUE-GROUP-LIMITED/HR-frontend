import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Globe,
  Key,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Shield,
  ExternalLink,
  Lock,
} from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils'

export const AdminWebsitesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')

  const { data: websites, isLoading } = useQuery({
    queryKey: ['websites'],
    queryFn: () => api.websites.list(),
  })

  // Rotate key mutation
  const rotateMutation = useMutation({
    mutationFn: (id: string) => api.websites.rotateKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] })
    },
  })

  // Create website mutation
  const createMutation = useMutation({
    mutationFn: () => api.websites.create(name, domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] })
      setAddModalOpen(false)
      setName('')
      setDomain('')
    },
  })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Websites & Intake Keys
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Super Admin control for registered portals and their secure API intake credentials.
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl text-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Website</span>
        </Button>
      </div>

      {/* Grid of 4 Websites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {websites?.map((site) => (
          <Card key={site.id} className="border-slate-200/80 hover:shadow-card transition-all">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: site.color || '#10B981' }}
                  >
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">{site.name}</CardTitle>
                    <CardDescription className="font-mono text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>{site.domain}</span>
                    </CardDescription>
                  </div>
                </div>

                <Badge variant={site.is_active ? 'success' : 'secondary'} className="text-[10px]">
                  {site.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Site Key Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Key className="h-3 w-3 text-amber-500" />
                    <span>Intake Header: X-Site-Key</span>
                  </span>
                  <span className="text-[10px] text-slate-400">REST API v1</span>
                </div>

                <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/80 p-2 rounded-xl">
                  <code className="text-xs font-mono text-slate-800 truncate select-all">
                    {site.site_key}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(site.site_key, site.id)}
                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 shrink-0"
                  >
                    {copiedKey === site.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">
                  Registered: {formatDateTime(site.created_at)}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={rotateMutation.isPending}
                  onClick={() => {
                    if (confirm(`Rotate security key for ${site.name}? Existing integrations will need the new key.`)) {
                      rotateMutation.mutate(site.id)
                    }
                  }}
                  className="h-8 text-xs font-semibold text-slate-700"
                >
                  <RefreshCw
                    className={`h-3 w-3 mr-1.5 ${rotateMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  <span>Rotate Key</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Register Website Modal */}
      <Dialog
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register Website Portal"
        description="Add a new web property to generate an API ingestion key."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name && domain) createMutation.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Website Name *
            </label>
            <Input
              placeholder="e.g. GUE Investor Relations"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Domain Name *
            </label>
            <Input
              placeholder="e.g. investors.gueholdings.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Generating Key...' : 'Register & Generate Key'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
