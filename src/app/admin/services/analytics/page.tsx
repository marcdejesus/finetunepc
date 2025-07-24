'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Wrench,
  CheckCircle,
  Calendar,
  Target,
  Award,
  UserCheck
} from 'lucide-react'
import { format } from 'date-fns'

interface AnalyticsData {
  summary: {
    totalServices: number
    totalRevenue: number
    averageServiceValue: number
    completionRate: number
    avgDaysToComplete: number
    avgActualHours: number
  }
  breakdowns: {
    status: Array<{ status: string; _count: { status: number } }>
    type: Array<{ type: string; _count: { type: number }; _sum: { price: number } }>
    priority: Array<{ priority: string; _count: { priority: number } }>
  }
  trends: Array<{
    period: Date
    count: number
    revenue: number
    completed: number
  }>
  technicianPerformance: Array<{
    technician: {
      id: string
      name: string | null
      email: string
      role: string
    } | undefined
    totalServices: number
    completedServices: number
    totalHours: number
    totalRevenue: number
    completionRate: number
  }>
  topCustomers: Array<{
    customer: {
      id: string
      name: string | null
      email: string
    } | undefined
    serviceCount: number
    totalSpent: number
  }>
  period: string
  dateRange: {
    start: Date
    end: Date
  }
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ON_HOLD: 'bg-gray-100 text-gray-800',
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
}

export default function ServiceAnalyticsPage() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [timeframe, setTimeframe] = useState('daily')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ period, timeframe })
        const response = await fetch(`/api/admin/services/analytics?${params}`)
        
        if (!response.ok) throw new Error('Failed to fetch analytics')
        
        const data = await response.json()
        setAnalytics(data)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [period, timeframe])

  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <UserCheck className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need admin or manager privileges to view analytics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Service Analytics</h2>
          <p className="text-muted-foreground">
            Insights and performance metrics for service operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{analytics.summary.totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${analytics.summary.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics.summary.completionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-full">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg. Completion</p>
                <p className="text-2xl font-bold">{analytics.summary.avgDaysToComplete.toFixed(1)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Service Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.breakdowns.status.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={statusColors[item.status as keyof typeof statusColors]} variant="secondary">
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{item._count.status}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(item._count.status / analytics.summary.totalServices) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>Service Types</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.breakdowns.type.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.type}</div>
                        <div className="text-sm text-muted-foreground">
                          ${(item._sum.price || 0).toFixed(2)} revenue
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{item._count.type}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(item._count.type / analytics.summary.totalServices) * 100}%` 
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
                  {analytics.breakdowns.priority.map((item) => (
                    <div key={item.priority} className="flex items-center justify-between">
                      <Badge className={priorityColors[item.priority as keyof typeof priorityColors]} variant="secondary">
                        {item.priority}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{item._count.priority}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(item._count.priority / analytics.summary.totalServices) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Key Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Service Value</span>
                    <span className="font-medium">${analytics.summary.averageServiceValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Hours per Service</span>
                    <span className="font-medium">{analytics.summary.avgActualHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Date Range</span>
                    <span className="font-medium text-sm">
                      {format(new Date(analytics.dateRange.start), 'MMM dd')} - {format(new Date(analytics.dateRange.end), 'MMM dd')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Technician Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Technician Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Technician</th>
                      <th className="text-left p-2">Services</th>
                      <th className="text-left p-2">Completed</th>
                      <th className="text-left p-2">Completion Rate</th>
                      <th className="text-left p-2">Total Hours</th>
                      <th className="text-left p-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.technicianPerformance.map((perf, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {perf.technician?.name?.split(' ').map(n => n[0]).join('') || 'T'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {perf.technician?.name || perf.technician?.email || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {perf.technician?.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">{perf.totalServices}</td>
                        <td className="p-2">{perf.completedServices}</td>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{perf.completionRate.toFixed(1)}%</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${perf.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-2">{perf.totalHours.toFixed(1)}h</td>
                        <td className="p-2">${perf.totalRevenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Top Customers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topCustomers.slice(0, 10).map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {customer.customer?.name?.split(' ').map(n => n[0]).join('') || 
                           customer.customer?.email[0].toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {customer.customer?.name || 'Unknown Customer'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {customer.customer?.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{customer.serviceCount} services</div>
                      <div className="text-sm text-muted-foreground">
                        ${customer.totalSpent.toFixed(2)} spent
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}