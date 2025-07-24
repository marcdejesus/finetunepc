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
import { Search, Users, UserCheck, UserX, Calendar, Mail, Phone, ShoppingBag, Wrench, Star } from 'lucide-react'
import { Role } from '@prisma/client'
import { format } from 'date-fns'

interface User {
  id: string
  name: string | null
  email: string
  role: Role
  image: string | null
  phone: string | null
  dateOfBirth: Date | null
  createdAt: Date
  updatedAt: Date
  emailVerified: Date | null
  _count: {
    orders: number
    services: number
    reviews: number
  }
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const roleColors = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  MANAGER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  TECHNICIAN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  USER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

export default function CustomersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      })
      
      if (roleFilter !== 'ALL') {
        params.append('role', roleFilter)
      }

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, currentPage, sortBy, sortOrder])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!response.ok) throw new Error('Failed to update role')
      
      await fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleRoleFilterChange = (value: Role | 'ALL') => {
    setRoleFilter(value)
    setCurrentPage(1)
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <UserX className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need admin privileges to view this page.</p>
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
          <h2 className="text-3xl font-bold tracking-tight">Customer Management</h2>
          <p className="text-muted-foreground">Manage users, roles, and customer information</p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">
            {pagination?.totalCount || 0} total customers
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="TECHNICIAN">Technician</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-gray-200 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>
                            {user.name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{user.name || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Badge className={roleColors[user.role]}>
                        {user.role}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {user.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Joined {format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className={user.emailVerified ? 'text-green-600' : 'text-red-600'}>
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <ShoppingBag className="h-4 w-4" />
                          <span>{user._count.orders}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Wrench className="h-4 w-4" />
                          <span>{user._count.services}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4" />
                          <span>{user._count.reviews}</span>
                        </div>
                      </div>
                      <Select 
                        value={user.role} 
                        onValueChange={(newRole: Role) => handleRoleChange(user.id, newRole)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">User</SelectItem>
                          <SelectItem value="TECHNICIAN">Tech</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">User</th>
                      <th className="text-left p-4 font-medium">Role</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Activity</th>
                      <th className="text-left p-4 font-medium">Joined</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b animate-pulse">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-gray-200 rounded-full" />
                              <div className="space-y-1">
                                <div className="h-4 bg-gray-200 rounded w-32" />
                                <div className="h-3 bg-gray-200 rounded w-24" />
                              </div>
                            </div>
                          </td>
                          <td className="p-4"><div className="h-6 bg-gray-200 rounded w-16" /></td>
                          <td className="p-4"><div className="h-6 bg-gray-200 rounded w-20" /></td>
                          <td className="p-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                          <td className="p-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                          <td className="p-4"><div className="h-8 bg-gray-200 rounded w-20" /></td>
                        </tr>
                      ))
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback className="text-xs">
                                  {user.name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name || 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={roleColors[user.role]} variant="secondary">
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-1">
                              <UserCheck className={`h-4 w-4 ${user.emailVerified ? 'text-green-500' : 'text-red-500'}`} />
                              <span className="text-sm">
                                {user.emailVerified ? 'Verified' : 'Unverified'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm space-y-1">
                              <div>{user._count.orders} orders</div>
                              <div className="text-muted-foreground">{user._count.services} services</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                            </div>
                          </td>
                          <td className="p-4">
                            <Select 
                              value={user.role} 
                              onValueChange={(newRole: Role) => handleRoleChange(user.id, newRole)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USER">User</SelectItem>
                                <SelectItem value="TECHNICIAN">Technician</SelectItem>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} results
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