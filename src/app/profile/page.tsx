import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Calendar, Shield, ShoppingBag, Wrench } from "lucide-react"

export default async function ProfilePage() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/signin")
  }

  const { user } = session

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your basic account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-24 h-24 bg-primary text-primary-foreground rounded-full text-2xl font-bold mx-auto">
                {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg">{user.name || "Not provided"}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Button className="w-full" disabled>
                Edit Profile (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Account Activity
              </CardTitle>
              <CardDescription>
                Recent account activity and statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">0</p>
                  <p className="text-sm text-blue-700">Orders</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-sm text-green-700">Services</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Member since</span>
                  <span>Today</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last sign in</span>
                  <span>Just now</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Account status</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" disabled>
                Download Account Data (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="justify-start" disabled>
                <ShoppingBag className="mr-2 h-4 w-4" />
                View Orders
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Wrench className="mr-2 h-4 w-4" />
                Book Service
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Shield className="mr-2 h-4 w-4" />
                Privacy Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 