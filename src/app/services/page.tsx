'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer, PageHeader, PageTitle, ResponsiveGrid } from '@/components/layout/page-container'
import { 
  Calendar, 
  Clock, 
  Wrench, 
  Monitor, 
  MessageSquare, 
  Download,
  Settings,
  Search,
  Plus,
  Filter,
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
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function ServicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

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
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    ON_HOLD: 'bg-gray-100 text-gray-800'
  }

  const priorityColors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800'
  }

  const fetchServices = async (status?: string) => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '20'
      })

      if (status && status !== 'all') {
        params.set('status', status.toUpperCase())
      }

      const response = await fetch(`/api/services?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch services')

      const data = await response.json()
      setServices(data.services)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchServices(activeTab)
  }, [session, status, router, activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    fetchServices(value)
  }

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <PageContainer>
      <PageHeader>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <PageTitle subtitle="Manage your computer service bookings and appointments">
            My Services
          </PageTitle>
          <Button 
            onClick={() => router.push('/services/book')}
            className="w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Book New Service
          </Button>
        </div>
      </PageHeader>

      {/* Service Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Object.entries({
          all: { label: 'Total Services', count: services.length, color: 'bg-blue-500' },
          pending: { 
            label: 'Pending', 
            count: services.filter(s => s.status === 'PENDING').length,
            color: 'bg-yellow-500'
          },
          confirmed: { 
            label: 'Confirmed', 
            count: services.filter(s => s.status === 'CONFIRMED').length,
            color: 'bg-blue-500'
          },
          completed: { 
            label: 'Completed', 
            count: services.filter(s => s.status === 'COMPLETED').length,
            color: 'bg-green-500'
          }
        }).map(([key, info]) => (
          <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{info.label}</p>
                  <p className="text-2xl font-bold">{info.count}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${info.color} flex items-center justify-center`}>
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle>Service History</CardTitle>
          <CardDescription>
            View and manage all your service bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Services</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No services found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'all' 
                      ? "You haven't booked any services yet." 
                      : `No ${activeTab} services found.`
                    }
                  </p>
                  <Button onClick={() => router.push('/services/book')}>
                    Book Your First Service
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => {
                    const IconComponent = serviceTypeIcons[service.type as keyof typeof serviceTypeIcons]
                    return (
                      <Card key={service.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <IconComponent className="w-6 h-6 text-primary" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="text-lg font-medium">{service.title}</h3>
                                  <Badge className={statusColors[service.status as keyof typeof statusColors]}>
                                    {service.status.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className={priorityColors[service.priority as keyof typeof priorityColors]}>
                                    {service.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {serviceTypeNames[service.type as keyof typeof serviceTypeNames]}
                                </p>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {service.description}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {format(new Date(service.scheduledDate), 'MMM dd, yyyy')}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {format(new Date(service.scheduledDate), 'hh:mm a')}
                                  </div>
                                  {service.price && (
                                    <div className="text-primary font-medium">
                                      ${service.price}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 md:mt-0 flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/services/${service.id}`)}
                              >
                                View Details
                              </Button>
                              {(service.status === 'PENDING' || service.status === 'CONFIRMED') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/services/${service.id}/edit`)}
                                >
                                  Manage
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  )
} 