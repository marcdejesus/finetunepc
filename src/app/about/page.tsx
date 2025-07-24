import { PageContainer, PageHeader, PageTitle, PageSection, ResponsiveGrid } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Award, Users, Wrench, Target, Shield, Truck, Star, Mail } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'About Us - Fine Tune PC',
  description: 'Learn about Fine Tune PC\'s mission, values, and the team dedicated to providing premium computer components and expert services.',
}

export default function AboutPage() {
  const stats = [
    { number: '10,000+', label: 'Happy Customers', icon: Users },
    { number: '15,000+', label: 'Products Sold', icon: Wrench },
    { number: '99.8%', label: 'Customer Satisfaction', icon: Star },
    { number: '5 Years', label: 'In Business', icon: Award },
  ]

  const values = [
    {
      icon: Shield,
      title: 'Quality First',
      description: 'We source only the highest quality components from trusted manufacturers with comprehensive warranties.',
    },
    {
      icon: Users,
      title: 'Expert Support',
      description: 'Our certified technicians provide professional guidance and support every step of the way.',
    },
    {
      icon: Target,
      title: 'Customer Focus',
      description: 'Your satisfaction is our priority. We tailor our services to meet your specific needs and goals.',
    },
    {
      icon: Truck,
      title: 'Reliable Service',
      description: 'Fast shipping, professional installation, and dependable repair services you can count on.',
    },
  ]

  const team = [
    {
      name: 'Marcus Chen',
      role: 'Founder & CEO',
      image: '/api/placeholder/300/400',
      bio: '15+ years in computer hardware with expertise in high-performance systems.',
    },
    {
      name: 'Sarah Williams',
      role: 'Lead Technician',
      image: '/api/placeholder/300/400',
      bio: 'CompTIA A+ certified with specialization in custom PC builds and repairs.',
    },
    {
      name: 'David Rodriguez',
      role: 'Customer Success Manager',
      image: '/api/placeholder/300/400',
      bio: 'Dedicated to ensuring every customer has an exceptional experience.',
    },
    {
      name: 'Emily Zhang',
      role: 'Product Specialist',
      image: '/api/placeholder/300/400',
      bio: 'Expert in gaming hardware and performance optimization solutions.',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <PageContainer className="text-center">
          <PageHeader>
            <PageTitle subtitle="Dedicated to providing premium computer components and expert services since 2019">
              About Fine Tune PC
            </PageTitle>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
              We're passionate about technology and committed to helping you build, upgrade, and maintain the perfect computer system for your needs.
            </p>
          </PageHeader>
        </PageContainer>
      </section>

      {/* Stats Section */}
      <PageSection>
        <PageContainer>
          <ResponsiveGrid cols={{ default: 2, lg: 4 }} gap="lg">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-none shadow-sm">
                <CardContent className="pt-6">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <stat.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </PageContainer>
      </PageSection>

      {/* Story Section */}
      <section className="bg-gray-50">
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-4">Our Story</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Born from Passion for Technology
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Fine Tune PC was founded in 2019 by a group of technology enthusiasts who believed that everyone deserves access to high-quality computer components and expert technical support.
                </p>
                <p>
                  What started as a small workshop has grown into a trusted partner for thousands of customers, from gaming enthusiasts to professional content creators and businesses.
                </p>
                <p>
                  Today, we continue to uphold our founding principles: quality products, expert service, and unwavering commitment to customer satisfaction.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild>
                  <Link href="/products">Shop Products</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/services">Our Services</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Workshop Image</p>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Values Section */}
      <PageSection>
        <PageContainer>
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Our Values</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">What Drives Us</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              These core values guide everything we do and shape how we serve our customers.
            </p>
          </div>

          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="lg">
            {values.map((value, index) => (
              <Card key={index} className="text-center border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </PageContainer>
      </PageSection>

      {/* Team Section */}
      <section className="bg-gray-50">
        <PageContainer>
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Our Team</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">Meet the Experts</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our experienced team is dedicated to providing you with the best products and services.
            </p>
          </div>

          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="lg">
            {team.map((member, index) => (
              <Card key={index} className="text-center border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-4 flex items-center justify-center">
                    <Users className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                  <p className="text-primary text-sm font-medium mb-3">{member.role}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {member.bio}
                  </p>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </PageContainer>
      </section>

      {/* CTA Section */}
      <PageSection>
        <PageContainer>
          <Card className="text-center border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="py-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Whether you need premium components or expert services, we're here to help you achieve your technology goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/contact">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Us
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary" asChild>
                  <Link href="/services/book">Book a Service</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </PageSection>
    </div>
  )
} 