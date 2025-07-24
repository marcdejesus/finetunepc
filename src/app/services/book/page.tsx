'use client'

import { useState, useEffect } from 'react'
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
  Wrench, 
  Monitor, 
  MessageSquare, 
  Download,
  Settings,
  Search,
  ArrowLeft,
  DollarSign,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'

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

export default function BookServicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Form state
  const [step, setStep] = useState(1)
  const [serviceType, setServiceType] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    deviceInfo: {
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      warrantyStatus: 'Unknown'
    },
    issueDetails: ''
  })

  const serviceTypeOptions = {
    REPAIR: {
      name: 'Repair Service',
      description: 'Fix hardware or software issues',
      icon: Wrench,
      price: 75,
      duration: 120,
      color: 'bg-red-500'
    },
    UPGRADE: {
      name: 'Upgrade Service',
      description: 'Hardware or software upgrades',
      icon: Monitor,
      price: 100,
      duration: 90,
      color: 'bg-blue-500'
    },
    CONSULTATION: {
      name: 'Consultation',
      description: 'Expert advice and recommendations',
      icon: MessageSquare,
      price: 50,
      duration: 60,
      color: 'bg-green-500'
    },
    INSTALLATION: {
      name: 'Installation Service',
      description: 'Software or hardware installation',
      icon: Download,
      price: 80,
      duration: 120,
      color: 'bg-purple-500'
    },
    MAINTENANCE: {
      name: 'Maintenance Service',
      description: 'Regular maintenance and cleaning',
      icon: Settings,
      price: 60,
      duration: 90,
      color: 'bg-yellow-500'
    },
    DIAGNOSTICS: {
      name: 'Diagnostics Service',
      description: 'Identify issues and problems',
      icon: Search,
      price: 45,
      duration: 60,
      color: 'bg-indigo-500'
    }
  }

  // Check authentication
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Fetch available slots when date and service type change
  useEffect(() => {
    if (selectedDate && serviceType) {
      fetchAvailableSlots()
    }
  }, [selectedDate, serviceType])

  const fetchAvailableSlots = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        type: serviceType
      })

      const response = await fetch(`/api/services/available-slots?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch available slots')

      const data = await response.json()
      setAvailableSlots(data)
    } catch (error) {
      console.error('Error fetching available slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleServiceTypeSelect = (type: string) => {
    setServiceType(type)
    setStep(2)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setStep(3)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !serviceType) return
    
    // Client-side validation
    if (formData.description.length < 5) {
      alert('Description must be at least 5 characters long')
      return
    }

    const requestData = {
      type: serviceType,
      title: formData.title,
      description: formData.description,
      scheduledDate: selectedSlot.datetime,
      priority: formData.priority,
      deviceInfo: formData.deviceInfo,
      issueDetails: formData.issueDetails
    }

    console.log('🔧 Client Service Booking Debug:', {
      formData,
      selectedSlot,
      serviceType,
      requestData
    })

    setSubmitting(true)
    try {
      console.log('📤 Sending service booking request:', requestData)
      
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      console.log('📥 Service booking response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Service booking API error:', error)
        throw new Error(error.error || 'Failed to book service')
      }

      const { service } = await response.json()
      console.log('✅ Service booking successful:', service)
      router.push(`/services/${service.id}?booked=true`)
    } catch (error) {
      console.error('🚨 Error booking service:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      alert(`Failed to book service: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
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

  const selectedServiceType = serviceType ? serviceTypeOptions[serviceType as keyof typeof serviceTypeOptions] : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => step > 1 ? setStep(step - 1) : router.push('/services')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step > 1 ? 'Back' : 'Back to Services'}
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Book a Service</h1>
        <p className="text-muted-foreground">
          Schedule a professional computer service appointment
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-primary text-white' : 'bg-muted'
            }`}>1</div>
            <span>Choose Service</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-primary text-white' : 'bg-muted'
            }`}>2</div>
            <span>Select Time</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-primary text-white' : 'bg-muted'
            }`}>3</div>
            <span>Service Details</span>
          </div>
        </div>
      </div>

      {/* Step 1: Service Type Selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(serviceTypeOptions).map(([key, service]) => {
            const IconComponent = service.icon
            return (
              <Card 
                key={key} 
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => handleServiceTypeSelect(key)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg ${service.color} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-1" />
                          {service.duration} min
                        </div>
                        <div className="flex items-center text-lg font-semibold text-primary">
                          <DollarSign className="w-4 h-4" />
                          {service.price}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Step 2: Date and Time Selection */}
      {step === 2 && selectedServiceType && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Selected Service Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Selected Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${selectedServiceType.color} flex items-center justify-center`}>
                    <selectedServiceType.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedServiceType.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedServiceType.description}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{selectedServiceType.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Starting price:</span>
                    <span className="font-medium">${selectedServiceType.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date and Time Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Date & Time</CardTitle>
                <CardDescription>
                  Choose your preferred appointment date and time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Select Date</Label>
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
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : availableSlots?.slots && availableSlots.slots.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableSlots.slots.map((slot, index) => (
                          <Button
                            key={index}
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
                    <h4 className="font-medium mb-2">Selected Appointment</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Date:</strong> {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
                      <p><strong>Time:</strong> {selectedSlot.time}</p>
                      <p><strong>Duration:</strong> {selectedSlot.duration} minutes</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Service Details Form */}
      {step === 3 && selectedServiceType && selectedSlot && (
        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg ${selectedServiceType.color} flex items-center justify-center`}>
                    <selectedServiceType.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedServiceType.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedServiceType.description}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{format(new Date(selectedDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{selectedSlot.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{selectedSlot.duration} min</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Estimated Cost:</span>
                    <span>${selectedServiceType.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Details Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
                <CardDescription>
                  Provide details about your service request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Service Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief description of your service request"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of what you need help with (minimum 5 characters)"
                      rows={4}
                      required
                      className={formData.description.length > 0 && formData.description.length < 5 ? 'border-red-500' : ''}
                    />
                    {formData.description.length > 0 && formData.description.length < 5 && (
                      <p className="text-sm text-red-500 mt-1">
                        Description must be at least 5 characters ({formData.description.length}/5)
                      </p>
                    )}
                    {formData.description.length >= 5 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Description length is valid ({formData.description.length} characters)
                      </p>
                    )}
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
                  <h4 className="font-medium">Device Information (Optional)</h4>
                  
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
                  <Label htmlFor="issueDetails">Specific Issue Details (Optional)</Label>
                  <Textarea
                    id="issueDetails"
                    value={formData.issueDetails}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDetails: e.target.value }))}
                    placeholder="Describe any specific issues, error messages, or symptoms you're experiencing"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={submitting || formData.description.length < 5}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      'Book Service'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  )
} 