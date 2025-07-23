'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Clock, 
  Wrench, 
  Monitor, 
  MessageSquare, 
  Download,
  Settings,
  Search,
  ArrowLeft,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'

interface Service {
  id: string
  type: string
  status: string
  title: string
  description: string
  scheduledDate: string
  completedDate?: string
  price?: number
  priority: string
  deviceInfo?: any
  issueDetails?: string
  resolution?: string
  estimatedHours?: number
  actualHours?: number
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export default function ServiceDetailPage({ 
  params 
}: { 
  params: Promise<{ serviceId: string }> 
}) {
  const { serviceId } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewBooking = searchParams.get('booked') === 'true'
  
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const serviceTypeIcons = {
    REPAIR: Wrench,
    UPGRADE: Monitor,
    CONSULTATION: MessageSquare,
    INSTALLATION: Download,
    MAINTENANCE: Settings,
    DIAGNOSTICS: Search
  }

  const serviceTypeNames = {
    REPAIR: 'Repair Service',
    UPGRADE: 'Upgrade Service',
    CONSULTATION: 'Consultation',
    INSTALLATION: 'Installation Service',
    MAINTENANCE: 'Maintenance Service',
    DIAGNOSTICS: 'Diagnostics Service'
  }

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
    IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const priorityColors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800'
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchService()
  }, [session, status, serviceId, router])

  const fetchService = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/services/${serviceId}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/services')
          return
        }
        throw new Error('Failed to fetch service')
      }

      const data = await response.json()
      setService(data.service)
    } catch (error) {
      console.error('Error fetching service:', error)
      router.push('/services')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelService = async () => {
    if (!service || !confirm('Are you sure you want to cancel this service? This action cannot be undone.')) return

    setCancelling(true)
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel service')
      }

      router.push('/services?cancelled=true')
    } catch (error) {
      console.error('Error cancelling service:', error)
      alert('Failed to cancel service. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!session || !service) {
    return null
  }

  const IconComponent = serviceTypeIcons[service.type as keyof typeof serviceTypeIcons]
  const canEdit = service.status === 'PENDING' || service.status === 'CONFIRMED'
  const canCancel = service.status === 'PENDING' || service.status === 'CONFIRMED'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/services')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{service.title}</h1>
            <p className="text-muted-foreground">
              {serviceTypeNames[service.type as keyof typeof serviceTypeNames]}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => router.push(`/services/${service.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancelService}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success Message for New Booking */}
      {isNewBooking && (
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">Service Booked Successfully!</h3>
                <p className="text-green-700">
                  Your service has been scheduled and a confirmation email has been sent to {session.user?.email}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Service Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>
                    {serviceTypeNames[service.type as keyof typeof serviceTypeNames]}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{service.description}</p>
              </div>
              
              {service.issueDetails && (
                <div>
                  <h4 className="font-medium mb-2">Issue Details</h4>
                  <p className="text-muted-foreground">{service.issueDetails}</p>
                </div>
              )}

              {service.resolution && (
                <div>
                  <h4 className="font-medium mb-2">Resolution</h4>
                  <p className="text-muted-foreground">{service.resolution}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Information */}
          {service.deviceInfo && Object.values(service.deviceInfo).some(val => val) && (
            <Card>
              <CardHeader>
                <CardTitle>Device Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.deviceInfo.brand && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Brand</Label>
                      <p className="text-sm">{service.deviceInfo.brand}</p>
                    </div>
                  )}
                  {service.deviceInfo.model && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                      <p className="text-sm">{service.deviceInfo.model}</p>
                    </div>
                  )}
                  {service.deviceInfo.serialNumber && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                      <p className="text-sm font-mono">{service.deviceInfo.serialNumber}</p>
                    </div>
                  )}
                  {service.deviceInfo.warrantyStatus && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Warranty Status</Label>
                      <p className="text-sm">{service.deviceInfo.warrantyStatus}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Service Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Service Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge className={statusColors[service.status as keyof typeof statusColors]}>
                    {service.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Priority */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                <div className="mt-1">
                  <Badge variant="outline" className={priorityColors[service.priority as keyof typeof priorityColors]}>
                    {service.priority}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Scheduled Date & Time */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Scheduled Date</Label>
                <div className="flex items-center mt-1 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(new Date(service.scheduledDate), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Scheduled Time</Label>
                <div className="flex items-center mt-1 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  {format(new Date(service.scheduledDate), 'hh:mm a')}
                </div>
              </div>

              {service.completedDate && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Completed Date</Label>
                  <div className="flex items-center mt-1 text-sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {format(new Date(service.completedDate), 'MMMM d, yyyy')}
                  </div>
                </div>
              )}

              <Separator />

              {/* Pricing */}
              {service.price && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {service.status === 'COMPLETED' ? 'Final Cost' : 'Estimated Cost'}
                  </Label>
                  <p className="text-lg font-semibold text-primary">${service.price}</p>
                </div>
              )}

              {/* Hours */}
              {(service.estimatedHours || service.actualHours) && (
                <div className="space-y-2">
                  {service.estimatedHours && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Estimated Hours</Label>
                      <p className="text-sm">{service.estimatedHours} hours</p>
                    </div>
                  )}
                  {service.actualHours && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Actual Hours</Label>
                      <p className="text-sm">{service.actualHours} hours</p>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Timestamps */}
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <Label className="text-xs font-medium">Created</Label>
                  <p>{format(new Date(service.createdAt), 'MMM d, yyyy hh:mm a')}</p>
                </div>
                {service.updatedAt !== service.createdAt && (
                  <div>
                    <Label className="text-xs font-medium">Last Updated</Label>
                    <p>{format(new Date(service.updatedAt), 'MMM d, yyyy hh:mm a')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Label component for this file
function Label({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <div className={`text-sm font-medium ${className || ''}`} {...props}>
      {children}
    </div>
  )
} 