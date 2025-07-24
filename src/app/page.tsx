import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContainer, PageSection, ResponsiveGrid } from '@/components/layout/page-container'
import { ArrowRight, Monitor, Wrench, Shield, Star, Truck, Phone } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const features = [
    {
      icon: Monitor,
      title: 'Premium Components',
      description: 'High-quality computer parts from trusted brands with warranty protection.',
    },
    {
      icon: Wrench,
      title: 'Expert Services',
      description: 'Professional repair, upgrade, and consultation services by certified technicians.',
    },
    {
      icon: Shield,
      title: 'Quality Guaranteed',
      description: 'All products and services come with comprehensive warranty and support.',
    },
    {
      icon: Truck,
      title: 'Fast Shipping',
      description: 'Quick and secure delivery for all orders with real-time tracking.',
    },
  ]

  const categories = [
    {
      name: 'Graphics Cards',
      description: 'High-performance GPUs for gaming and professional work',
      href: '/products?category=graphics-cards',
      image: '/api/placeholder/300/200'
    },
    {
      name: 'Processors',
      description: 'Latest CPUs from Intel and AMD',
      href: '/products?category=processors',
      image: '/api/placeholder/300/200'
    },
    {
      name: 'Memory & Storage',
      description: 'RAM, SSDs, and storage solutions',
      href: '/products?category=memory-storage',
      image: '/api/placeholder/300/200'
    },
    {
      name: 'Motherboards',
      description: 'Quality motherboards for every build',
      href: '/products?category=motherboards',
      image: '/api/placeholder/300/200'
    },
  ]

  const services = [
    {
      title: 'Computer Repair',
      description: 'Expert diagnosis and repair of hardware and software issues',
      price: 'Starting at $75',
      duration: '2 hours',
    },
    {
      title: 'System Upgrade',
      description: 'Upgrade your PC with latest components for better performance',
      price: 'Starting at $100',
      duration: '1.5 hours',
    },
    {
      title: 'Consultation',
      description: 'Professional advice on building or upgrading your system',
      price: 'Starting at $50',
      duration: '1 hour',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <PageContainer className="text-center">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight text-gray-900">
                Fine Tune Your
                <span className="block text-primary">Perfect PC</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                Premium computer parts, expert services, and professional support for enthusiasts and professionals alike.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/products">
                  Shop Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/services">
                  Book Service
                  <Wrench className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.9/5 Customer Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span>Free Shipping Over $100</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>Expert Support</span>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Features Section */}
      <PageSection>
        <PageContainer>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Why Choose Fine Tune PC?</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We're committed to providing the best computer components and services with expert support every step of the way.
            </p>
          </div>

          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="lg">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </PageContainer>
      </PageSection>

      {/* Product Categories */}
      <PageSection>
        <PageContainer>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Shop by Category</h2>
            <p className="text-lg text-muted-foreground">
              Find exactly what you need for your perfect build
            </p>
          </div>

          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="lg">
            {categories.map((category, index) => (
              <Link key={index} href={category.href} className="group">
                <Card className="overflow-hidden border-none shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <Monitor className="h-12 w-12 text-gray-400" />
                    </div>
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {category.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </ResponsiveGrid>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" asChild>
              <Link href="/products">
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </PageSection>

      {/* Services Section */}
      <section className="bg-gray-50">
        <PageContainer>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Professional Services</h2>
            <p className="text-lg text-muted-foreground">
              Expert technicians ready to help with all your computer needs
            </p>
          </div>

          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 3 }} gap="lg">
            {services.map((service, index) => (
              <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-primary">{service.price}</span>
                    <span className="text-muted-foreground">{service.duration}</span>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/services/book">Book Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>

          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <Link href="/services">
                View All Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground">
        <PageContainer className="text-center">
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Ready to Build Your Dream PC?</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Get expert advice, premium components, and professional service all in one place. 
              Start your journey to the perfect computer today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/products">Start Shopping</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  )
}
