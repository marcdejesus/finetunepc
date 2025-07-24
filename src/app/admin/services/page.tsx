'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Wrench, 
  Clock, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Filter,
  MoreVertical,
  UserCheck,
  Settings
} from 'lucide-react'
import { ServiceStatus, ServiceType, Priority } from '@prisma/client'
import { format } from 'date-fns'

interface Service {
  id: string
  title: string
  description: string
  type: ServiceType
  status: ServiceStatus
  priority: Priority
  scheduledDate: Date
  price: number
  estimatedHours: number
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    image: string | null
  }
  assignedUser: {
    id: string
    name: string | null
    email: string
    role: string
    image: string | null
  } | null
}

interface Technician {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
  _count: {
    assignedServices: number
  }
}

interface ServicesResponse {
  services: Service[]
  technicians: Technician[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  statusCounts: Record<string, number>
}

const statusIcons = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  IN_PROGRESS: PlayCircle,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
  ON_HOLD: PauseCircle,
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ON_HOLD: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const serviceTypeIcons = {
  REPAIR: Wrench,
  UPGRADE: Settings,
  CONSULTATION: User,
  INSTALLATION: Settings,
  MAINTENANCE: Wrench,
  DIAGNOSTICS: AlertCircle,
}

export default function ServicesQueuePage() {
  const { data: session } = useSession()
  const [services, setServices] = useState<Service[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<ServiceType | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'ALL' | 'unassigned'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<ServicesResponse['pagination'] | null>(null)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        page: currentPage.toString(),
        limit: '20',
      })
      
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter !== 'ALL') params.append('type', typeFilter)
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter)
      if (assigneeFilter !== 'ALL') params.append('assignedTo', assigneeFilter)

      const response = await fetch(`/api/admin/services?${params}`)
      if (!response.ok) throw new Error('Failed to fetch services')
      
      const data: ServicesResponse = await response.json()
      setServices(data.services)
      setTechnicians(data.technicians)
      setPagination(data.pagination)
      setStatusCounts(data.statusCounts)
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, priorityFilter, assigneeFilter, currentPage])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleBulkUpdate = async (updates: any) => {
    try {
      if (selectedServices.length === 0) return

      const response = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: selectedServices,
          updates
        }),
      })

      if (!response.ok) throw new Error('Failed to update services')
      
      setSelectedServices([])
      await fetchServices()
    } catch (error) {
      console.error('Error updating services:', error)
    }
  }

  const handleSingleServiceUpdate = async (serviceId: string, updates: any) => {
    try {
      const response = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: [serviceId],
          updates
        }),
      })

      if (!response.ok) throw new Error('Failed to update service')
      
      await fetchServices()
    } catch (error) {
      console.error('Error updating service:', error)
    }
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
    setSelectedServices([])
  }

  useEffect(() => {
    handleFilterChange()
  }, [statusFilter, typeFilter, priorityFilter, assigneeFilter, search])

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedServices(prev =>
      prev.length === services.length ? [] : services.map(s => s.id)
    )
  }

  if (!session?.user || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <UserCheck className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need appropriate privileges to view service management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Service Request Queue</h2>
          <p className="text-muted-foreground">Manage service requests and technician assignments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5" />
          <span className="text-sm font-medium">
            {pagination?.totalCount || 0} total services
          </span>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries({
          PENDING: 'Pending',
          CONFIRMED: 'Confirmed', 
          IN_PROGRESS: 'In Progress',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled',
          ON_HOLD: 'On Hold'
        }).map(([status, label]) => {
          const IconComponent = statusIcons[status as ServiceStatus]
          const count = statusCounts[status] || 0
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setStatusFilter(status as ServiceStatus)}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: ServiceStatus | 'ALL') => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value: ServiceType | 'ALL') => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="REPAIR">Repair</SelectItem>
                <SelectItem value="UPGRADE">Upgrade</SelectItem>
                <SelectItem value="CONSULTATION">Consultation</SelectItem>
                <SelectItem value="INSTALLATION">Installation</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="DIAGNOSTICS">Diagnostics</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value: Priority | 'ALL') => setPriorityFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={(value: string | 'ALL' | 'unassigned') => setAssigneeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name || tech.email} ({tech._count.assignedServices})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {session.user.role !== 'TECHNICIAN' && selectedServices.length > 0 && (
            <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedServices.length} selected
              </span>
              <Select onValueChange={(value) => handleBulkUpdate({ assignedTo: value === 'unassign' ? null : value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name || tech.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(value) => handleBulkUpdate({ status: value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Change Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Set Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirm</SelectItem>
                  <SelectItem value="IN_PROGRESS">Start Work</SelectItem>
                  <SelectItem value="COMPLETED">Mark Complete</SelectItem>
                  <SelectItem value="ON_HOLD">Put on Hold</SelectItem>
                  <SelectItem value="CANCELLED">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  {session.user.role !== 'TECHNICIAN' && (
                    <th className="text-left p-4 w-12">
                      <Checkbox
                        checked={selectedServices.length === services.length && services.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="text-left p-4 font-medium">Service</th>
                  <th className="text-left p-4 font-medium">Customer</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Priority</th>
                  <th className="text-left p-4 font-medium">Assigned</th>
                  <th className="text-left p-4 font-medium">Scheduled</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {session.user.role !== 'TECHNICIAN' && <td className="p-4"><div className="h-4 w-4 bg-gray-200 rounded" /></td>}
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                      <td className="p-4"><div className="h-6 bg-gray-200 rounded w-20" /></td>
                      <td className="p-4"><div className="h-6 bg-gray-200 rounded w-16" /></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      <td className="p-4"><div className="h-8 bg-gray-200 rounded w-8" /></td>
                    </tr>
                  ))
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={session.user.role !== 'TECHNICIAN' ? 8 : 7} className="text-center py-12">
                      <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
                      <p className="text-muted-foreground">No services match your current filters.</p>
                    </td>
                  </tr>
                ) : (
                  services.map((service) => {
                    const StatusIcon = statusIcons[service.status]
                    const TypeIcon = serviceTypeIcons[service.type]
                    return (
                      <tr key={service.id} className="border-b hover:bg-muted/50 transition-colors">
                        {session.user.role !== 'TECHNICIAN' && (
                          <td className="p-4">
                            <Checkbox
                              checked={selectedServices.includes(service.id)}
                              onCheckedChange={() => toggleServiceSelection(service.id)}
                            />
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 rounded-full bg-muted">
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{service.title}</div>
                              <div className="text-sm text-muted-foreground">{service.type}</div>
                              <div className="text-sm text-muted-foreground">
                                ${service.price} • {service.estimatedHours}h est.
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={service.user.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {service.user.name?.split(' ').map(n => n[0]).join('') || service.user.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{service.user.name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{service.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={statusColors[service.status]} variant="secondary">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {service.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={priorityColors[service.priority]} variant="secondary">
                            {service.priority}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {service.assignedUser ? (
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={service.assignedUser.image || undefined} />
                                <AvatarFallback className="text-xs">
                                  {service.assignedUser.name?.split(' ').map(n => n[0]).join('') || 'T'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{service.assignedUser.name || service.assignedUser.email}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {format(new Date(service.scheduledDate), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(service.scheduledDate), 'HH:mm')}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            {/* Technicians can update status for their assigned services */}
                            {session.user.role === 'TECHNICIAN' && service.assignedUser?.id === session.user.id ? (
                              <Select 
                                value={service.status} 
                                onValueChange={(newStatus) => handleSingleServiceUpdate(service.id, { status: newStatus })}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {/* Dynamic options based on current status */}
                                  {service.status === 'PENDING' && (
                                    <>
                                      <SelectItem value="CONFIRMED">Confirm</SelectItem>
                                      <SelectItem value="IN_PROGRESS">Start</SelectItem>
                                    </>
                                  )}
                                  {service.status === 'CONFIRMED' && (
                                    <>
                                      <SelectItem value="IN_PROGRESS">Start</SelectItem>
                                      <SelectItem value="ON_HOLD">Hold</SelectItem>
                                    </>
                                  )}
                                  {service.status === 'IN_PROGRESS' && (
                                    <>
                                      <SelectItem value="COMPLETED">Complete</SelectItem>
                                      <SelectItem value="ON_HOLD">Hold</SelectItem>
                                    </>
                                  )}
                                  {service.status === 'ON_HOLD' && (
                                    <>
                                      <SelectItem value="IN_PROGRESS">Resume</SelectItem>
                                      <SelectItem value="CONFIRMED">Confirm</SelectItem>
                                    </>
                                  )}
                                  {service.status === 'COMPLETED' && (
                                    <SelectItem value="IN_PROGRESS">Reopen</SelectItem>
                                  )}
                                  <SelectItem value={service.status} disabled>
                                    Current: {service.status.replace('_', ' ')}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/admin/services/${service.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} services
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!pagination.hasPrev}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i
                if (pageNum > pagination.totalPages) return null
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={!pagination.hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}