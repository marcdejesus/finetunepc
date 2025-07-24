'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  User, 
  Clock, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Wrench,
  DollarSign,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Save,
  UserCheck
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
  completedDate: Date | null
  price: number
  estimatedHours: number
  actualHours: number | null
  assignedTo: string | null
  partsUsed: string[]
  deviceInfo: any
  issueDetails: string | null
  resolution: string | null
  // API mapped fields for frontend compatibility
  notes: string | null
  completionNotes: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    image: string | null
    addresses: Array<{
      id: string
      addressLine1: string
      addressLine2: string | null
      city: string
      state: string
      postalCode: string
      type: string
    }>
  }
  assignedUser: {
    id: string
    name: string | null
    email: string
    role: string
    image: string | null
    phone: string | null
  } | null
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

export default function ServiceDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const serviceId = params?.serviceId as string

  const [service, setService] = useState<Service | null>(null)
  const [technicians, setTechnicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    status: '',
    assignedTo: '',
    priority: '',
    actualHours: '',
    partsUsed: [] as string[],
    notes: '',
    completionNotes: ''
  })

  useEffect(() => {
    const fetchService = async () => {
      try {
        console.log(`🔍 PAGE: Starting to fetch service ${serviceId}`)
        console.log(`🔍 PAGE: Current session:`, session?.user)
        
        setLoading(true)
        
        console.log(`🔍 PAGE: Making API calls to fetch service and technicians`)
        const [serviceRes, techRes] = await Promise.all([
          fetch(`/api/admin/services/${serviceId}`),
          fetch('/api/admin/services')
        ])

        console.log(`🔍 PAGE: Service API response status: ${serviceRes.status}`)
        console.log(`🔍 PAGE: Technicians API response status: ${techRes.status}`)

        if (!serviceRes.ok) {
          const errorData = await serviceRes.text()
          console.error(`🚫 PAGE: Service API error:`, errorData)
          throw new Error('Failed to fetch service')
        }
        if (!techRes.ok) {
          const errorData = await techRes.text()
          console.error(`🚫 PAGE: Technicians API error:`, errorData)
          throw new Error('Failed to fetch technicians')
        }

        const serviceData = await serviceRes.json()
        const techData = await techRes.json()
        
        console.log(`✅ PAGE: Successfully fetched service data:`, serviceData.service?.id)
        console.log(`✅ PAGE: Successfully fetched technicians count:`, techData.services?.length || 0)

        setService(serviceData.service)
        setTechnicians(techData.technicians || [])

                 // Initialize form data
         const svc = serviceData.service
         setFormData({
           status: svc.status,
           assignedTo: svc.assignedTo || '',
           priority: svc.priority,
           actualHours: svc.actualHours?.toString() || '',
           partsUsed: svc.partsUsed || [],
           notes: svc.notes || '',
           completionNotes: svc.completionNotes || ''
         })
      } catch (error) {
        console.error('🚫 PAGE: Error fetching service:', error)
        // Check if it's an auth error by trying to parse the error
        if (error instanceof Error) {
          console.error('🚫 PAGE: Error message:', error.message)
        }
      } finally {
        setLoading(false)
      }
    }

    if (serviceId) {
      fetchService()
    }
  }, [serviceId])

  const handleSave = async () => {
    try {
      setSaving(true)
      const updates: any = {}

      // Only include changed fields
      if (formData.status !== service?.status) updates.status = formData.status
      if (formData.assignedTo !== (service?.assignedTo || '')) {
        updates.assignedTo = formData.assignedTo || null
      }
      if (formData.priority !== service?.priority) updates.priority = formData.priority
      if (formData.actualHours !== (service?.actualHours?.toString() || '')) {
        updates.actualHours = formData.actualHours ? parseFloat(formData.actualHours) : null
      }
             if (JSON.stringify(formData.partsUsed) !== JSON.stringify(service?.partsUsed || [])) {
         updates.partsUsed = formData.partsUsed
       }
       if (formData.notes !== (service?.notes || '')) updates.notes = formData.notes
       if (formData.completionNotes !== (service?.completionNotes || '')) {
         updates.completionNotes = formData.completionNotes
       }

      if (Object.keys(updates).length === 0) return

      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update service')

      const updatedData = await response.json()
      setService(updatedData.service)
      
      // Show success message or redirect
      router.refresh()
    } catch (error) {
      console.error('Error updating service:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!session?.user || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <UserCheck className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need appropriate privileges to view this service.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Service Not Found</h2>
        <p className="text-muted-foreground">The requested service could not be found.</p>
      </div>
    )
  }

  const StatusIcon = statusIcons[service.status]
  const canManage = ['ADMIN', 'MANAGER'].includes(session.user.role)
  const isAssignedTechnician = session.user.role === 'TECHNICIAN' && service.assignedTo === session.user.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{service.title}</h2>
            <p className="text-muted-foreground">{service.type} • Created {format(new Date(service.createdAt), 'MMM dd, yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[service.status]} variant="secondary">
            <StatusIcon className="h-3 w-3 mr-1" />
            {service.status.replace('_', ' ')}
          </Badge>
          <Badge className={priorityColors[service.priority]} variant="secondary">
            {service.priority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Customer</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={service.user.image || undefined} />
                <AvatarFallback>
                  {service.user.name?.split(' ').map(n => n[0]).join('') || service.user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{service.user.name || 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">{service.user.email}</div>
              </div>
            </div>
            
            {service.user.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{service.user.phone}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{service.user.email}</span>
            </div>

            {service.user.addresses.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Address</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {service.user.addresses[0].addressLine1}
                  {service.user.addresses[0].addressLine2 && <><br />{service.user.addresses[0].addressLine2}</>}
                  <br />
                  {service.user.addresses[0].city}, {service.user.addresses[0].state} {service.user.addresses[0].postalCode}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wrench className="h-5 w-5" />
              <span>Service Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Price</Label>
                <div className="flex items-center space-x-1 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{service.price}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Estimated Hours</Label>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{service.estimatedHours}h</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Scheduled Date</Label>
              <div className="flex items-center space-x-1 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{format(new Date(service.scheduledDate), 'PPP p')}</span>
              </div>
            </div>

            {service.deviceInfo && (
              <div>
                <Label className="text-sm font-medium">Device Information</Label>
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  {service.deviceInfo.brand && <div>Brand: {service.deviceInfo.brand}</div>}
                  {service.deviceInfo.model && <div>Model: {service.deviceInfo.model}</div>}
                  {service.deviceInfo.serialNumber && <div>Serial: {service.deviceInfo.serialNumber}</div>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment & Status Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                disabled={!canManage && !isAssignedTechnician}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canManage ? (
                    <>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    </>
                  ) : (
                    // Technician status options based on current status
                    <>
                      {service.status === 'PENDING' && (
                        <>
                          <SelectItem value="CONFIRMED">Confirm Service</SelectItem>
                          <SelectItem value="IN_PROGRESS">Start Work</SelectItem>
                        </>
                      )}
                      {service.status === 'CONFIRMED' && (
                        <>
                          <SelectItem value="IN_PROGRESS">Start Work</SelectItem>
                          <SelectItem value="ON_HOLD">Put on Hold</SelectItem>
                        </>
                      )}
                      {service.status === 'IN_PROGRESS' && (
                        <>
                          <SelectItem value="COMPLETED">Mark Complete</SelectItem>
                          <SelectItem value="ON_HOLD">Put on Hold</SelectItem>
                        </>
                      )}
                      {service.status === 'ON_HOLD' && (
                        <>
                          <SelectItem value="IN_PROGRESS">Resume Work</SelectItem>
                          <SelectItem value="CONFIRMED">Back to Confirmed</SelectItem>
                        </>
                      )}
                      {service.status === 'COMPLETED' && (
                        <SelectItem value="IN_PROGRESS">Reopen Service</SelectItem>
                      )}
                      {/* Show current status as disabled option for clarity */}
                      <SelectItem value={service.status} disabled>
                        Current: {service.status.replace('_', ' ')}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment (Admin/Manager only) */}
            {canManage && (
              <div>
                <Label htmlFor="assignedTo">Assigned Technician</Label>
                <Select 
                  value={formData.assignedTo} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name || tech.email} ({tech._count.assignedServices} active)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Priority (Admin/Manager only) */}
            {canManage && (
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Current Assignment Display */}
            {service.assignedUser && (
              <div>
                <Label>Currently Assigned To</Label>
                <div className="flex items-center space-x-2 mt-1 p-2 bg-muted rounded">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={service.assignedUser.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {service.assignedUser.name?.split(' ').map(n => n[0]).join('') || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{service.assignedUser.name || service.assignedUser.email}</div>
                    <div className="text-xs text-muted-foreground">{service.assignedUser.role}</div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Work Details */}
            <div>
              <Label htmlFor="actualHours">Actual Hours</Label>
              <Input
                id="actualHours"
                type="number"
                step="0.5"
                value={formData.actualHours}
                onChange={(e) => setFormData(prev => ({ ...prev, actualHours: e.target.value }))}
                placeholder="0.0"
              />
            </div>

            <div>
              <Label htmlFor="notes">Work Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add work notes..."
                rows={3}
              />
            </div>

            {formData.status === 'COMPLETED' && (
              <div>
                <Label htmlFor="completionNotes">Completion Notes</Label>
                <Textarea
                  id="completionNotes"
                  value={formData.completionNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, completionNotes: e.target.value }))}
                  placeholder="Summary of work completed..."
                  rows={3}
                />
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}