'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wrench,
  Clock,
  CheckCircle,
  Calendar,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  User,
  Phone,
  Mail,
  MapPin,
  BarChart3,
  Activity,
  Target,
  Timer,
  Award,
  UserCheck
} from 'lucide-react'
import { ServiceStatus, ServiceType, Priority } from '@prisma/client'
import { format, isToday, isThisWeek } from 'date-fns'

interface TechnicianDashboardData {
  summary: {
    assignedServices: number
    todayServicesCount: number
    weekServices: number
    completedThisMonth: number
    totalHoursThisWeek: number
    efficiencyRate: number
    avgCompletionDays: number
  }
  todayServices: Array<{
    id: string
    title: string
    type: ServiceType
    status: ServiceStatus
    priority: Priority
    scheduledDate: Date
    estimatedHours: number
    user: {
      id: string
      name: string | null
      email: string
      phone: string | null
      image: string | null
    }
  }>
  upcomingServices: Array<{
    id: string
    title: string
    type: ServiceType
    status: ServiceStatus
    priority: Priority
    scheduledDate: Date
    estimatedHours: number
    user: {
      id: string
      name: string | null
      email: string
      phone: string | null
    }
  }>
  recentActivity: Array<{
    id: string
    title: string
    status: ServiceStatus
    updatedAt: Date
    user: {
      name: string | null
      email: string
    }
  }>
  statusCounts: Record<string, number>
  priorityCounts: Record<string, number>
  technician: {
    id: string
    name: string | null
    email: string
    role: string
  }
}

const statusIcons = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  IN_PROGRESS: PlayCircle,
  COMPLETED: CheckCircle,
  CANCELLED: AlertCircle,
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
  UPGRADE: TrendingUp,
  CONSULTATION: User,
  INSTALLATION: Wrench,
  MAINTENANCE: Wrench,
  DIAGNOSTICS: AlertCircle,
}

export default function TechnicianDashboard() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<TechnicianDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/technician/dashboard')
        
        if (!response.ok) throw new Error('Failed to fetch dashboard data')
        
        const data = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (!session?.user || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <UserCheck className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need technician privileges to view this dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || !dashboardData) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technician Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {dashboardData.technician.name || 'Technician'}! Here's your service overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            <Wrench className="h-3 w-3 mr-1" />
            {dashboardData.technician.role}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Services</p>
                <p className="text-2xl font-bold">{dashboardData.summary.assignedServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-full">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Today's Services</p>
                <p className="text-2xl font-bold">{dashboardData.summary.todayServicesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed (30d)</p>
                <p className="text-2xl font-bold">{dashboardData.summary.completedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <Timer className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Hours This Week</p>
                <p className="text-2xl font-bold">{dashboardData.summary.totalHoursThisWeek.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-cyan-100 rounded-full">
                <Target className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Efficiency Rate</p>
                <p className="text-xl font-bold">{dashboardData.summary.efficiencyRate}%</p>
                <p className="text-xs text-muted-foreground">Estimated vs Actual Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-full">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                <p className="text-xl font-bold">{dashboardData.summary.avgCompletionDays} days</p>
                <p className="text-xs text-muted-foreground">Average time to complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-pink-100 rounded-full">
                <Award className="h-5 w-5 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-xl font-bold">{dashboardData.summary.weekServices}</p>
                <p className="text-xs text-muted-foreground">Services scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today's Work</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Today's Services ({dashboardData.summary.todayServicesCount})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.todayServices.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Services Today</h3>
                  <p className="text-muted-foreground">You have no services scheduled for today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.todayServices.map((service) => {
                    const StatusIcon = statusIcons[service.status]
                    const TypeIcon = serviceTypeIcons[service.type]
                    return (
                      <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-muted rounded-full">
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{service.title}</h3>
                            <p className="text-sm text-muted-foreground">{service.type}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={statusColors[service.status]} variant="secondary">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {service.status.replace('_', ' ')}
                              </Badge>
                              <Badge className={priorityColors[service.priority]} variant="secondary">
                                {service.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="text-sm font-medium">{service.user.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{service.user.email}</p>
                              {service.user.phone && (
                                <p className="text-xs text-muted-foreground">{service.user.phone}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm">{format(new Date(service.scheduledDate), 'HH:mm')}</p>
                              <p className="text-xs text-muted-foreground">{service.estimatedHours}h est.</p>
                            </div>
                            <Button size="sm" asChild>
                              <a href={`/admin/services/${service.id}`}>View</a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Upcoming Services</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.upcomingServices.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Services</h3>
                  <p className="text-muted-foreground">You have no services scheduled for the next 7 days.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.upcomingServices.map((service) => {
                    const StatusIcon = statusIcons[service.status]
                    return (
                      <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h4 className="font-medium">{service.title}</h4>
                            <p className="text-sm text-muted-foreground">{service.user.name || service.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={statusColors[service.status]} variant="secondary">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {service.status.replace('_', ' ')}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {format(new Date(service.scheduledDate), 'MMM dd, HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">{service.estimatedHours}h</p>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/admin/services/${service.id}`}>View</a>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Status: {activity.status.replace('_', ' ')} • {activity.user.name || activity.user.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{format(new Date(activity.updatedAt), 'MMM dd, HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Service Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={statusColors[status as keyof typeof statusColors]} variant="secondary">
                          {status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(count / Math.max(...Object.values(dashboardData.statusCounts))) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Priority Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData.priorityCounts).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <Badge className={priorityColors[priority as keyof typeof priorityColors]} variant="secondary">
                        {priority}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(count / Math.max(...Object.values(dashboardData.priorityCounts))) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}