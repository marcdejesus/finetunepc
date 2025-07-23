'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  ArrowLeft,
  Save,
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
  priority: string
  deviceInfo?: any
  issueDetails?: string
  price?: number
}

interface TimeSlot {
  datetime: string
  time: string
  available: boolean
  duration: number
}

interface AvailableSlots {
  date: string
  serviceType?: string
  estimatedDuration: number
  slots: TimeSlot[]
  businessHours: {
    start: string
    end: string
  }
}

export default function EditServicePage({ 
  params 
}: { 
  params: Promise<{ serviceId: string }> 
}) {
  const { serviceId } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Form state
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    description: '',
    priority: 'MEDIUM',
    deviceInfo: {
      brand: '',
      model: '',
      serialNumber: '',
      warrantyStatus: 'Unknown'
    },
    issueDetails: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchService()
  }, [session, status, serviceId, router])

  useEffect(() => {
    if (selectedDate && service) {
      fetchAvailableSlots()
    }
  }, [selectedDate, service])

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
      const serviceData = data.service
      
      // Check if service can be edited
      if (serviceData.status === 'COMPLETED' || serviceData.status === 'CANCELLED') {
        router.push(`/services/${serviceId}`)
        return
      }
      
      setService(serviceData)
      setFormData({
        description: serviceData.description,
        priority: serviceData.priority,
        deviceInfo: serviceData.deviceInfo || {
          brand: '',
          model: '',
          serialNumber: '',
          warrantyStatus: 'Unknown'
        },
        issueDetails: serviceData.issueDetails || ''
      })
    } catch (error) {
      console.error('Error fetching service:', error)
      router.push('/services')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSlots = async () => {
    if (!service) return
    
    setLoadingSlots(true)
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        type: service.type
      })

      const response = await fetch(`/api/services/available-slots?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch available slots')

      const data = await response.json()
      setAvailableSlots(data)
    } catch (error) {
      console.error('Error fetching available slots:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const generateDateOptions = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        value: date.toISOString().split('T')[0],
        label: format(date, 'EEEE, MMMM d, yyyy')
      })
    }
    
    return dates
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!service) return

    setSaving(true)
    try {
      const updateData: any = {
        description: formData.description,
        priority: formData.priority,
        deviceInfo: formData.deviceInfo,
        issueDetails: formData.issueDetails
      }

      // Include scheduled date if rescheduling
      if (selectedSlot) {
        updateData.scheduledDate = selectedSlot.datetime
      }

      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update service')
      }

      router.push(`/services/${serviceId}?updated=true`)
    } catch (error) {
      console.error('Error updating service:', error)
      alert('Failed to update service. Please try again.')
    } finally {
      setSaving(false)
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/services/${serviceId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Service Details
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Edit Service</h1>
        <p className="text-muted-foreground">
          Update your service details or reschedule your appointment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Service Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Current Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                <p className="font-medium">{service.title}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                <p>{service.type.replace('_', ' ')}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Badge>{service.status}</Badge>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Current Date</Label>
                <div className="flex items-center mt-1 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(new Date(service.scheduledDate), 'MMMM d, yyyy')}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Current Time</Label>
                <div className="flex items-center mt-1 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  {format(new Date(service.scheduledDate), 'hh:mm a')}
                </div>
              </div>

              {service.price && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estimated Cost</Label>
                  <p className="text-lg font-semibold text-primary">${service.price}</p>
                </div>
              )}

              <Separator />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowReschedule(!showReschedule)}
              >
                {showReschedule ? 'Hide Reschedule' : 'Reschedule Appointment'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reschedule Section */}
          {showReschedule && (
            <Card>
              <CardHeader>
                <CardTitle>Reschedule Appointment</CardTitle>
                <CardDescription>
                  Choose a new date and time for your service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Select New Date</Label>
                  <Select value={selectedDate} onValueChange={handleDateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a date" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateDateOptions().map((date) => (
                        <SelectItem key={date.value} value={date.value}>
                          {date.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <Label className="text-base font-medium mb-3 block">Available Time Slots</Label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : availableSlots?.slots && availableSlots.slots.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableSlots.slots.map((slot, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant={selectedSlot?.datetime === slot.datetime ? "default" : "outline"}
                            className="h-auto py-3"
                            onClick={() => handleSlotSelect(slot)}
                            disabled={!slot.available}
                          >
                            <div className="text-center">
                              <div className="font-medium">{slot.time}</div>
                              <div className="text-xs opacity-75">{slot.duration} min</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No available slots for this date</p>
                        <p className="text-sm">Please select a different date</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedSlot && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">New Appointment Time</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Date:</strong> {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
                      <p><strong>Time:</strong> {selectedSlot.time}</p>
                      <p><strong>Duration:</strong> {selectedSlot.duration} minutes</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>
                Update the details of your service request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of what you need help with"
                    rows={4}
                    required
                  />
                </div>

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
              </div>

              <Separator />

              {/* Device Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Device Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.deviceInfo.brand}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deviceInfo: { ...prev.deviceInfo, brand: e.target.value }
                      }))}
                      placeholder="e.g. Dell, HP, Apple"
                    />
                  </div>

                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.deviceInfo.model}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deviceInfo: { ...prev.deviceInfo, model: e.target.value }
                      }))}
                      placeholder="e.g. Inspiron 15, MacBook Pro"
                    />
                  </div>

                  <div>
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      value={formData.deviceInfo.serialNumber}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deviceInfo: { ...prev.deviceInfo, serialNumber: e.target.value }
                      }))}
                      placeholder="Device serial number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="warrantyStatus">Warranty Status</Label>
                    <Select 
                      value={formData.deviceInfo.warrantyStatus} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        deviceInfo: { ...prev.deviceInfo, warrantyStatus: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Under Warranty">Under Warranty</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Issue Details */}
              <div>
                <Label htmlFor="issueDetails">Specific Issue Details</Label>
                <Textarea
                  id="issueDetails"
                  value={formData.issueDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueDetails: e.target.value }))}
                  placeholder="Describe any specific issues, error messages, or symptoms you're experiencing"
                  rows={3}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push(`/services/${serviceId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
} 