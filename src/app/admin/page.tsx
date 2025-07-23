import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp,
  Shield,
  Settings
} from "lucide-react"

export default async function AdminDashboard() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/auth/error?error=AccessDenied")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {session.user.name}</p>
          </div>
          <Badge variant="default" className="text-sm">
            <Shield className="h-3 w-3 mr-1" />
            Administrator
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Demo users active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0%</div>
            <p className="text-xs text-muted-foreground">
              Platform just launched
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="text-sm text-muted-foreground">
              • Manage Products (Coming Soon)
            </div>
            <div className="text-sm text-muted-foreground">
              • View Orders (Coming Soon)
            </div>
            <div className="text-sm text-muted-foreground">
              • Manage Users (Coming Soon)
            </div>
            <div className="text-sm text-muted-foreground">
              • Service Requests (Coming Soon)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current platform health
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Database</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connected
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Authentication</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Payment Processing</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Test Mode
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Email Service</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Configured
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Access Control Demo */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-green-600">✅ Authentication Success</CardTitle>
          <CardDescription>
            Role-based access control is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-700">
              🎉 <strong>Congratulations!</strong> You have successfully accessed the admin dashboard. 
              This page is protected by role-based access control and only users with the "ADMIN" role can see this content.
            </p>
            <div className="mt-3 text-xs text-green-600">
              <p><strong>Your session:</strong></p>
              <p>• Email: {session.user.email}</p>
              <p>• Role: {session.user.role}</p>
              <p>• ID: {session.user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 