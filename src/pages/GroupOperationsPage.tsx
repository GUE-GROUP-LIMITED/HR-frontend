import React, { useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Factory,
  GraduationCap,
  Plus,
  Sprout,
  Truck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { GROUP_ENTITIES, INITIAL_OPERATIONAL_WORK } from '@/services/operationsData'
import { GroupEntity, OperationalWorkItem, OperationalWorkStatus } from '@/types/operations'
import { hasPermission, hasScopedPermission } from '@/lib/access'

const sectorIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Technology services': Activity,
  Education: GraduationCap,
  'Engineering and software': Briefcase,
  Agriculture: Sprout,
  'Manufacturing and industrial parks': Factory,
  Mobility: Truck,
  'Financial inclusion': Building2,
  'Real estate': Building2,
}

const statusLabels: Record<OperationalWorkStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  needs_review: 'Needs review',
  complete: 'Complete',
}

const statusVariants: Record<OperationalWorkStatus, 'secondary' | 'default' | 'warning' | 'success'> = {
  planned: 'secondary',
  in_progress: 'default',
  needs_review: 'warning',
  complete: 'success',
}

const initialForm = {
  entityId: 'gue-cyber',
  title: '',
  workstream: '',
  summary: '',
  dueDate: '',
}

export const GroupOperationsPage: React.FC = () => {
  const { currentUser } = useAuth()
  const [workItems, setWorkItems] = useState<OperationalWorkItem[]>(INITIAL_OPERATIONAL_WORK)
  const [selectedEntityId, setSelectedEntityId] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const canManage = hasPermission(currentUser, 'manage_operations')
  const canViewEntity = (entityId: string) => {
    const entity = GROUP_ENTITIES.find((candidate) => candidate.id === entityId)
    if (!entity) return false
    const companyId = entity.type === 'operating_unit' ? entity.parentId ?? entity.id : entity.id
    const unitId = entity.type === 'operating_unit' ? entity.id : undefined
    return hasScopedPermission(currentUser, 'view_operations', companyId, unitId)
  }
  const entities = GROUP_ENTITIES.filter(
    (entity) => entity.type === 'subsidiary' && canViewEntity(entity.id)
  )
  const operatingUnits = GROUP_ENTITIES.filter(
    (entity) =>
      entity.type === 'operating_unit' &&
      canViewEntity(entity.id)
  )
  const scopedOperatingUnits = operatingUnits.filter(
    (entity) => !canViewEntity(entity.parentId ?? '')
  )
  const portfolioEntities = [...entities, ...scopedOperatingUnits]

  const visibleWork = useMemo(() => {
    const childIds = GROUP_ENTITIES
      .filter((entity) => entity.parentId === selectedEntityId)
      .map((entity) => entity.id)
    return workItems.filter((item) => {
      const matchesEntity =
        selectedEntityId === 'all' ||
        item.entityId === selectedEntityId ||
        childIds.includes(item.entityId)
      const entity = GROUP_ENTITIES.find((candidate) => candidate.id === item.entityId)
      const companyId = entity?.type === 'operating_unit' ? entity.parentId ?? entity.id : item.entityId
      const unitId = entity?.type === 'operating_unit' ? entity.id : undefined
      const hasEntityAccess = hasScopedPermission(
        currentUser,
        'view_operations',
        companyId,
        unitId
      )
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.workstream.toLowerCase().includes(query) ||
        entity?.name.toLowerCase().includes(query)
      return matchesEntity && matchesSearch && hasEntityAccess
    })
  }, [currentUser, search, selectedEntityId, workItems])

  const inProgressCount = visibleWork.filter((item) => item.status === 'in_progress').length
  const reviewCount = visibleWork.filter((item) => item.status === 'needs_review').length
  const completedCount = visibleWork.filter((item) => item.status === 'complete').length

  const updateWorkStatus = (itemId: string, status: OperationalWorkStatus) => {
    const item = workItems.find((candidate) => candidate.id === itemId)
    if (!item) return
    const entity = GROUP_ENTITIES.find((candidate) => candidate.id === item.entityId)
    const companyId = entity?.type === 'operating_unit' ? entity.parentId ?? entity.id : item.entityId
    const unitId = entity?.type === 'operating_unit' ? entity.id : undefined
    const canManageItem =
      canManage ||
      hasScopedPermission(currentUser, 'manage_operations', companyId, unitId)
    if (!canManageItem || (!canManage && status === 'complete')) return

    setWorkItems((items) => items.map((candidate) => (
      candidate.id === itemId ? { ...candidate, status } : candidate
    )))
  }

  const createWorkItem = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canManage) return
    if (!form.title.trim() || !form.workstream.trim() || !form.summary.trim()) return

    setWorkItems((items) => [
      {
        ...form,
        id: `op-demo-${Date.now()}`,
        title: form.title.trim(),
        workstream: form.workstream.trim(),
        summary: form.summary.trim(),
        status: 'planned',
      },
      ...items,
    ])
    setForm(initialForm)
    setCreateOpen(false)
  }

  if (!hasPermission(currentUser, 'view_operations')) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Group operations access</h2>
        <p className="mt-2 text-sm text-slate-500">
          Operational work is limited to the Super Admin and assigned group operations managers.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Group Operations</h2>
            <Badge variant="outline">Demo</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            A staged operations workspace across GUE Group’s eight subsidiaries.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add work item
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Demo data only. This prototype does not connect to subsidiary systems or authorize production
        work. Guemoni transaction data must remain in the approved UBA platform.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Operating subsidiaries" value={entities.length} icon={Building2} />
        <MetricCard title="Web properties" value={10} icon={Activity} />
        <MetricCard title="In progress" value={inProgressCount} icon={ClipboardList} />
        <MetricCard title="Needs review" value={reviewCount} icon={CalendarDays} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Subsidiary portfolio</h3>
            <p className="text-xs text-slate-500">
              Select a company to filter its demo work queue.
            </p>
          </div>
          <Button
            variant={selectedEntityId === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedEntityId('all')}
          >
            All subsidiaries
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {portfolioEntities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              selected={selectedEntityId === entity.id}
              itemCount={visibleWork.filter((item) => {
                if (item.entityId === entity.id) return true
                const itemEntity = GROUP_ENTITIES.find((candidate) => candidate.id === item.entityId)
                return itemEntity?.parentId === entity.id
              }).length}
              onClick={() =>
                setSelectedEntityId((selected) => (selected === entity.id ? 'all' : entity.id))
              }
            />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="gap-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Operational work queue</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Synthetic examples based on each company’s publicly described work.
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search work items..."
            aria-label="Search work items"
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs sm:max-w-xs"
          />
        </CardHeader>
        <CardContent className="p-0">
          {visibleWork.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No work items match this filter.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleWork.map((item) => {
                const entity = GROUP_ENTITIES.find((candidate) => candidate.id === item.entityId)
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        <Badge variant={statusVariants[item.status]}>{statusLabels[item.status]}</Badge>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {entity?.name} · {item.workstream}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.summary}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {item.dueDate && (
                        <span className="text-xs text-slate-500">
                          Due {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString()}
                        </span>
                      )}
                      {(canManage || hasScopedPermission(
                        currentUser,
                        'manage_operations',
                        entity?.type === 'operating_unit' ? entity.parentId ?? item.entityId : item.entityId,
                        entity?.type === 'operating_unit' ? entity.id : undefined
                      )) && (item.status !== 'complete' || canManage) && (
                        <select
                          aria-label={`Update status for ${item.title}`}
                          value={item.status}
                          onChange={(event) =>
                            updateWorkStatus(item.id, event.target.value as OperationalWorkStatus)
                          }
                          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs"
                        >
                          {Object.entries(statusLabels)
                            .filter(([value]) => canManage || value !== 'complete')
                            .map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
        <div className="space-y-2 border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {completedCount} complete in this view
          </span>
          <p>
            Operating units (not separate subsidiaries):{' '}
            {operatingUnits.map((unit, index) => {
              const parent = GROUP_ENTITIES.find((entity) => entity.id === unit.parentId)
              const status = unit.status === 'in_development' ? 'in development' : 'status to verify'
              return (
                <React.Fragment key={unit.id}>
                  {index > 0 && '; '}
                  {unit.name} under {parent?.name} ({status})
                  {unit.locations?.length ? ` · ${unit.locations.join(', ')}` : ''}
                </React.Fragment>
              )
            })}
            .
          </p>
        </div>
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add demo work item"
        description="Creates a local-only example; it will reset when this page reloads."
      >
        <form onSubmit={createWorkItem} className="space-y-4">
          <FormField label="Company or operating unit">
            <select
              value={form.entityId}
              onChange={(event) => setForm((value) => ({ ...value, entityId: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              {portfolioEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>{entity.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Work item">
            <input
              required
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
          </FormField>
          <FormField label="Workstream">
            <input
              required
              value={form.workstream}
              onChange={(event) => setForm((value) => ({ ...value, workstream: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
          </FormField>
          <FormField label="Summary">
            <textarea
              required
              rows={3}
              value={form.summary}
              onChange={(event) => setForm((value) => ({ ...value, summary: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
          </FormField>
          <FormField label="Due date">
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((value) => ({ ...value, dueDate: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit">Create work item</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</span>
      <Icon className="h-4 w-4 text-emerald-600" />
    </div>
    <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
  </Card>
)

interface EntityCardProps {
  entity: GroupEntity
  selected: boolean
  itemCount: number
  onClick: () => void
}

const EntityCard: React.FC<EntityCardProps> = ({ entity, selected, itemCount, onClick }) => {
  const Icon = sectorIcons[entity.sector] || Building2
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? 'border-emerald-400 bg-emerald-50/60'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold text-slate-500">{itemCount} items</span>
      </div>
      <h4 className="mt-3 text-sm font-bold text-slate-900">{entity.name}</h4>
      <p className="mt-1 text-xs text-slate-500">{entity.sector}</p>
      {entity.locations?.length ? (
        <p className="mt-1 text-xs font-medium text-slate-600">
          Workplaces: {entity.locations.join(' · ')}
        </p>
      ) : null}
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{entity.description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
        View work queue <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  )
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
    <span>{label}</span>
    {children}
  </label>
)
