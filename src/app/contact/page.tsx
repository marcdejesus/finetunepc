'use client'

import { useState } from 'react'
import { PageContainer, PageHeader, PageTitle, PageSection, ResponsiveGrid } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Headphones, 
  Wrench,
  Loader2,
  CheckCircle
} from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    category: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const contactMethods = [
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Speak directly with our experts',
      contact: '(555) 123-4567',
      action: 'Call Now',
      hours: 'Mon-Fri 9AM-6PM'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get detailed help via email',
      contact: 'support@finetunepc.com',
      action: 'Send Email',
      hours: '24/7 Response'
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our support team',
      contact: 'Available on website',
      action: 'Start Chat',
      hours: 'Mon-Fri 9AM-6PM'
    },
    {
      icon: Wrench,
      title: 'Service Request',
      description: 'Book a service appointment',
      contact: 'Online booking system',
      action: 'Book Service',
      hours: 'Schedule anytime'
    }
  ]

  const businessHours = [
    { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: '10:00 AM - 4:00 PM' },
    { day: 'Sunday', hours: 'Closed' },
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setIsSubmitted(true)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Message Sent Successfully!</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Thank you for contacting us. We've received your message and will get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setIsSubmitted(false)}>
              Send Another Message
            </Button>
            <Button variant="outline" asChild>
              <a href="/">Return Home</a>
            </Button>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <PageContainer>
          <PageHeader>
            <PageTitle 
              subtitle="Get in touch with our team of experts. We're here to help with all your computer needs."
              className="text-center"
            >
              Contact Us
            </PageTitle>
          </PageHeader>
        </PageContainer>
      </section>

      {/* Contact Methods */}
      <PageSection>
        <PageContainer>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">How Can We Help?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the contact method that works best for you. Our team is ready to assist with any questions or concerns.
            </p>
          </div>

          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="lg">
            {contactMethods.map((method, index) => (
              <Card key={index} className="text-center border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <method.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{method.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                  <p className="text-sm font-medium mb-2">{method.contact}</p>
                  <Badge variant="secondary" className="text-xs mb-4">{method.hours}</Badge>
                  <Button className="w-full" size="sm">
                    {method.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </PageContainer>
      </PageSection>

      {/* Contact Form & Info */}
      <section className="bg-gray-50">
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">Send Us a Message</h2>
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Inquiry Type *</Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="sales">Sales Question</SelectItem>
                            <SelectItem value="support">Technical Support</SelectItem>
                            <SelectItem value="service">Service Request</SelectItem>
                            <SelectItem value="warranty">Warranty Claim</SelectItem>
                            <SelectItem value="feedback">Feedback</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        rows={5}
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        placeholder="Please provide details about your inquiry..."
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending Message...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Location & Hours */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Visit Our Store</h3>
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Our Location</p>
                        <p className="text-sm text-muted-foreground">
                          123 Tech Street<br />
                          Silicon Valley, CA 94000<br />
                          United States
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium mb-2">Business Hours</p>
                        <div className="space-y-1">
                          {businessHours.map((schedule, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{schedule.day}:</span>
                              <span className="font-medium">{schedule.hours}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Direct Contact */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Direct Contact</h3>
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">(555) 123-4567</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">support@finetunepc.com</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Headphones className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Emergency Support</p>
                        <p className="text-sm text-muted-foreground">(555) 123-4567 ext. 911</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* FAQ Link */}
              <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Need Quick Answers?</h3>
                  <p className="text-sm opacity-90 mb-4">
                    Check our FAQ section for common questions and solutions.
                  </p>
                  <Button variant="secondary" size="sm">
                    View FAQ
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  )
} 