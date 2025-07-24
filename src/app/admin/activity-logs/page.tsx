'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, Search, Calendar, User, Shield, ShoppingCart, Wrench, MessageSquare, Settings, Eye, Filter } from 'lucide-react'
import { ActivityAction } from '@prisma/client'
import { format } from 'date-fns'

interface ActivityLog {
  id: string
  action: ActivityAction
  resource: string
  resourceId: string | null
  details: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    role: string
  }
}

interface ActivityLogsResponse {
  logs: ActivityLog[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const actionIcons = {
  LOGIN: Activity,
  LOGOUT: Activity,
  REGISTER: User,
  PASSWORD_CHANGE: Shield,
  EMAIL_CHANGE: Shield,
  PROFILE_UPDATE: User,
  ORDER_CREATE: ShoppingCart,
  ORDER_UPDATE: ShoppingCart,
  ORDER_CANCEL: ShoppingCart,
  SERVICE_CREATE: Wrench,
  SERVICE_UPDATE: Wrench,
  SERVICE_CANCEL: Wrench,
  REVIEW_CREATE: MessageSquare,
  REVIEW_UPDATE: MessageSquare,
  REVIEW_DELETE: MessageSquare,
  ROLE_CHANGE: Settings,
  ACCOUNT_DELETE: Shield,
}

const actionColors = {
  LOGIN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  REGISTER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PASSWORD_CHANGE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  EMAIL_CHANGE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  PROFILE_UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ORDER_CREATE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ORDER_UPDATE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ORDER_CANCEL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  SERVICE_CREATE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  SERVICE_UPDATE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  SERVICE_CANCEL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  REVIEW_CREATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  REVIEW_UPDATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  REVIEW_DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ROLE_CHANGE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  ACCOUNT_DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function ActivityLogsPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState<ActivityAction | 'ALL'>('ALL')
  const [resourceFilter, setResourceFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<ActivityLogsResponse['pagination'] | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      })
      
      if (userFilter) params.append('userId', userFilter)
      if (actionFilter !== 'ALL') params.append('action', actionFilter)
      if (resourceFilter) params.append('resource', resourceFilter)

      const response = await fetch(`/api/admin/activity-logs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch activity logs')
      
      const data: ActivityLogsResponse = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLoading(false)
    }
  }, [userFilter, actionFilter, resourceFilter, currentPage])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  useEffect(() => {
    handleFilterChange()
  }, [userFilter, actionFilter, resourceFilter])

  const getActionDescription = (log: ActivityLog) => {
    const action = log.action.toLowerCase().replace('_', ' ')
    const resource = log.resource.toLowerCase()
    
    switch (log.action) {
      case 'LOGIN':
        return 'Signed in to account'
      case 'LOGOUT':
        return 'Signed out of account'
      case 'REGISTER':
        return 'Created new account'
      case 'PASSWORD_CHANGE':
        return 'Changed account password'
      case 'EMAIL_CHANGE':
        return 'Updated email address'
      case 'PROFILE_UPDATE':
        return 'Updated profile information'
      case 'ORDER_CREATE':
        return `Created new order ${log.resourceId ? `#${log.resourceId}` : ''}`
      case 'ORDER_UPDATE':
        return `Updated order ${log.resourceId ? `#${log.resourceId}` : ''}`
      case 'ORDER_CANCEL':
        return `Cancelled order ${log.resourceId ? `#${log.resourceId}` : ''}`
      case 'SERVICE_CREATE':
        return `Created new service request ${log.resourceId ? `#${log.resourceId}` : ''}`
      case 'SERVICE_UPDATE':
        return `Updated service request ${log.resourceId ? `#${log.resourceId}` : ''}`
      case 'SERVICE_CANCEL':
        return `Cancelled service request ${log.resourceId ? `#${log.resourceId}` : ''}`
      case 'REVIEW_CREATE':
        return 'Created new review'
      case 'REVIEW_UPDATE':
        return 'Updated review'
      case 'REVIEW_DELETE':
        return 'Deleted review'
      case 'ROLE_CHANGE':
        return `Role changed to ${log.details?.newRole || 'unknown'}`
      case 'ACCOUNT_DELETE':
        return 'Deleted account'
      default:
        return `${action} ${resource}`
    }
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need admin privileges to view activity logs.</p>
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
          <h2 className="text-3xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-muted-foreground">Monitor user activities and system events</p>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span className="text-sm font-medium">
            {pagination?.totalCount || 0} total activities
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Resource</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by resource..."
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionFilter} onValueChange={(value: ActivityAction | 'ALL') => setActionFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="REGISTER">Register</SelectItem>
                  <SelectItem value="PASSWORD_CHANGE">Password Change</SelectItem>
                  <SelectItem value="EMAIL_CHANGE">Email Change</SelectItem>
                  <SelectItem value="PROFILE_UPDATE">Profile Update</SelectItem>
                  <SelectItem value="ORDER_CREATE">Order Create</SelectItem>
                  <SelectItem value="ORDER_UPDATE">Order Update</SelectItem>
                  <SelectItem value="ORDER_CANCEL">Order Cancel</SelectItem>
                  <SelectItem value="SERVICE_CREATE">Service Create</SelectItem>
                  <SelectItem value="SERVICE_UPDATE">Service Update</SelectItem>
                  <SelectItem value="SERVICE_CANCEL">Service Cancel</SelectItem>
                  <SelectItem value="REVIEW_CREATE">Review Create</SelectItem>
                  <SelectItem value="REVIEW_UPDATE">Review Update</SelectItem>
                  <SelectItem value="REVIEW_DELETE">Review Delete</SelectItem>
                  <SelectItem value="ROLE_CHANGE">Role Change</SelectItem>
                  <SelectItem value="ACCOUNT_DELETE">Account Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Filter by user ID..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Activity Found</h3>
                <p className="text-muted-foreground">No activity logs match your current filters.</p>
              </div>
            ) : (
              logs.map((log, index) => {
                const IconComponent = actionIcons[log.action] || Activity
                return (
                  <div key={log.id} className={`flex items-center space-x-4 p-4 ${index !== logs.length - 1 ? 'border-b' : ''} hover:bg-muted/50 transition-colors`}>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${actionColors[log.action] || 'bg-gray-100'}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.user.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {log.user.name?.split(' ').map(n => n[0]).join('') || log.user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{log.user.name || log.user.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.user.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getActionDescription(log)}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {JSON.stringify(log.details, null, 0)}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                      </div>
                      {log.ipAddress && (
                        <div className="text-xs text-muted-foreground">
                          {log.ipAddress}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} activities
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