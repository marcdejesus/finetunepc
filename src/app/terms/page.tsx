import { PageContainer, PageHeader, PageTitle } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata = {
  title: 'Terms of Service - Fine Tune PC',
  description: 'Read our terms of service and conditions for using Fine Tune PC services and products.',
}

export default function TermsPage() {
  const lastUpdated = 'December 15, 2024'

  return (
    <PageContainer maxWidth="4xl">
      <PageHeader>
        <PageTitle subtitle="Please read these terms and conditions carefully before using our services">
          Terms of Service
        </PageTitle>
        <p className="text-sm text-muted-foreground mt-4">
          Last updated: {lastUpdated}
        </p>
      </PageHeader>

      <Card className="border-none shadow-sm">
        <CardContent className="p-8 prose prose-gray max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                By accessing and using Fine Tune PC's website, products, and services, you accept and agree to be bound by the terms and provision of this agreement. These Terms of Service ("Terms") govern your use of our website located at finetunepc.com and all associated services provided by Fine Tune PC.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                If you do not agree to abide by the above, please do not use our services. We reserve the right to update and change these Terms without notice by posting updates and changes to our website.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Permission is granted to temporarily download one copy of the materials on Fine Tune PC's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained on our website</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                This license shall automatically terminate if you violate any of these restrictions and may be terminated by Fine Tune PC at any time.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Products and Services</h2>
              <h3 className="text-lg font-medium mb-3">Product Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We strive to provide accurate product descriptions, specifications, and pricing. However, we do not warrant that product descriptions or other content is accurate, complete, reliable, current, or error-free.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Pricing and Availability</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                All prices are subject to change without notice. We reserve the right to modify or discontinue products at any time. Product availability is subject to stock levels and may vary.
              </p>

              <h3 className="text-lg font-medium mb-3">Service Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our technical services are provided by qualified technicians. Service appointments must be scheduled in advance and are subject to availability. Service fees are due at the time of service completion unless otherwise arranged.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Orders and Payment</h2>
              <h3 className="text-lg font-medium mb-3">Order Acceptance</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your receipt of an electronic or other form of order confirmation does not signify our acceptance of your order, nor does it constitute confirmation of our offer to sell. We reserve the right to accept or decline your order for any reason.
              </p>

              <h3 className="text-lg font-medium mb-3">Payment Terms</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Payment is due at the time of purchase unless otherwise specified. We accept major credit cards, debit cards, and other payment methods as displayed on our website. All transactions are processed securely.
              </p>

              <h3 className="text-lg font-medium mb-3">Refund Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Product Refunds:</strong> We do not offer refunds on physical products once sold. All sales are final.
                <br /><br />
                <strong>Service Refunds:</strong> Service fees may be refunded only in cases of unsatisfactory service quality, as determined by Fine Tune PC management.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Shipping and Delivery</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We offer various shipping options with different delivery timeframes. Shipping costs are calculated based on the destination, package weight, and selected shipping method. Free shipping is available on orders over $100 within the continental United States.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Delivery times are estimates and may vary due to factors beyond our control. We are not responsible for delays caused by shipping carriers, weather conditions, or other external factors.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Warranties and Disclaimers</h2>
              <h3 className="text-lg font-medium mb-3">Product Warranties</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Products sold by Fine Tune PC are covered by manufacturer warranties. We do not provide additional warranties beyond those offered by the manufacturer. Warranty claims must be processed directly with the manufacturer.
              </p>

              <h3 className="text-lg font-medium mb-3">Service Disclaimer</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                While we strive to provide excellent service, we cannot guarantee specific outcomes for repair or upgrade services. Our liability is limited to the cost of the service provided.
              </p>

              <h3 className="text-lg font-medium mb-3">Website Disclaimer</h3>
              <p className="text-muted-foreground leading-relaxed">
                The materials on our website are provided on an 'as is' basis. Fine Tune PC makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Limitations of Liability</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                In no event shall Fine Tune PC or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website or services, even if Fine Tune PC or an authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. User Accounts and Security</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion, particularly in cases of suspected fraudulent activity or violation of these terms.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Privacy and Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our services. By using our services, you agree to the collection and use of information in accordance with our Privacy Policy.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                These terms and conditions are governed by and construed in accordance with the laws of California, United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Any disputes arising from these terms or your use of our services will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We reserve the right to update or modify these Terms of Service at any time without prior notice. Your continued use of our services after any such changes constitutes your acceptance of the new Terms of Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We encourage you to review these terms periodically to stay informed of any updates.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">Fine Tune PC</p>
                <p className="text-sm text-muted-foreground">
                  123 Tech Street<br />
                  Silicon Valley, CA 94000<br />
                  Email: legal@finetunepc.com<br />
                  Phone: (555) 123-4567
                </p>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
} 