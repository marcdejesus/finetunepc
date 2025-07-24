import { PageContainer, PageHeader, PageTitle } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Privacy Policy - Fine Tune PC',
  description: 'Learn how Fine Tune PC collects, uses, and protects your personal information and data.',
}

export default function PrivacyPage() {
  const lastUpdated = 'December 15, 2024'

  return (
    <PageContainer maxWidth="4xl">
      <PageHeader>
        <PageTitle subtitle="Your privacy is important to us. This policy explains how we collect, use, and protect your information.">
          Privacy Policy
        </PageTitle>
        <p className="text-sm text-muted-foreground mt-4">
          Last updated: {lastUpdated}
        </p>
      </PageHeader>

      <Card className="border-none shadow-sm">
        <CardContent className="p-8 prose prose-gray max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              
              <h3 className="text-lg font-medium mb-3">Personal Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Create an account on our website</li>
                <li>Make a purchase or place an order</li>
                <li>Schedule a service appointment</li>
                <li>Contact us for support or inquiries</li>
                <li>Subscribe to our newsletter or marketing communications</li>
                <li>Participate in surveys or promotions</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Types of Personal Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The personal information we may collect includes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Name and contact information (email, phone, address)</li>
                <li>Payment information (credit card details, billing address)</li>
                <li>Account credentials (username, password)</li>
                <li>Service history and preferences</li>
                <li>Communication history with our support team</li>
                <li>Computer specifications and technical information (for service purposes)</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Automatically Collected Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you visit our website, we automatically collect certain information about your device and usage:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>IP address and geolocation data</li>
                <li>Browser type and version</li>
                <li>Operating system information</li>
                <li>Pages visited and time spent on our website</li>
                <li>Referring website information</li>
                <li>Cookies and similar tracking technologies data</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect for the following purposes:
              </p>

              <h3 className="text-lg font-medium mb-3">Service Delivery</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Process and fulfill your orders</li>
                <li>Provide technical support and customer service</li>
                <li>Schedule and manage service appointments</li>
                <li>Send order confirmations and updates</li>
                <li>Handle warranty claims and returns</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Account Management</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Create and maintain your user account</li>
                <li>Authenticate your identity</li>
                <li>Remember your preferences and settings</li>
                <li>Provide personalized recommendations</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Communication</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Respond to your inquiries and support requests</li>
                <li>Send important updates about our services</li>
                <li>Deliver marketing communications (with your consent)</li>
                <li>Notify you about promotions and special offers</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Business Operations</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Analyze website usage and improve our services</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
                <li>Conduct research and development</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Information Sharing and Disclosure</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
              </p>

              <h3 className="text-lg font-medium mb-3">Service Providers</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may share your information with trusted third-party service providers who assist us in:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Payment processing (Stripe, PayPal)</li>
                <li>Shipping and logistics</li>
                <li>Email marketing and communications</li>
                <li>Website analytics and performance monitoring</li>
                <li>Customer support platforms</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Legal Requirements</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may disclose your information when required by law or to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Comply with legal processes or government requests</li>
                <li>Protect our rights, property, or safety</li>
                <li>Investigate potential fraud or security issues</li>
                <li>Enforce our terms of service</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Business Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity, subject to the same privacy protections.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>

              <h3 className="text-lg font-medium mb-3">Security Measures</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>SSL encryption for data transmission</li>
                <li>Secure payment processing systems</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and employee training</li>
                <li>Data backup and recovery procedures</li>
                <li>Incident response protocols</li>
              </ul>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <Badge variant="secondary" className="mb-2">Important Note</Badge>
                <p className="text-sm text-muted-foreground">
                  While we strive to protect your personal information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security but are committed to using industry-standard practices.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Cookies and Tracking Technologies</h2>
              
              <h3 className="text-lg font-medium mb-3">What Are Cookies</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience and analyze website usage.
              </p>

              <h3 className="text-lg font-medium mb-3">Types of Cookies We Use</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
                <li><strong>Performance Cookies:</strong> Help us analyze website usage and performance</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Managing Cookies</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can control and delete cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our website.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Your Privacy Rights</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>

              <h3 className="text-lg font-medium mb-3">Access and Portability</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Request access to your personal information</li>
                <li>Receive a copy of your data in a portable format</li>
                <li>Request information about how we use your data</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Correction and Deletion</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Correct inaccurate or incomplete information</li>
                <li>Request deletion of your personal information</li>
                <li>Withdraw consent for data processing</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Marketing Communications</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Opt-out of marketing emails and communications</li>
                <li>Update your communication preferences</li>
                <li>Unsubscribe from promotional materials</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Exercising Your Rights</h3>
              <p className="text-muted-foreground leading-relaxed">
                To exercise any of these rights, please contact us at privacy@finetunepc.com. We will respond to your request within 30 days and may require identity verification.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                We retain your personal information only as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law.
              </p>

              <h3 className="text-lg font-medium mb-3">Retention Periods</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li><strong>Account Information:</strong> Until account deletion or 3 years of inactivity</li>
                <li><strong>Order History:</strong> 7 years for tax and accounting purposes</li>
                <li><strong>Service Records:</strong> 5 years for warranty and support purposes</li>
                <li><strong>Marketing Data:</strong> Until you unsubscribe or request deletion</li>
                <li><strong>Website Analytics:</strong> 2 years for performance analysis</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our services are primarily based in the United States. If you are accessing our services from outside the US, please note that your information may be transferred to, stored, and processed in the United States.
              </p>
              
              <p className="text-muted-foreground leading-relaxed">
                We ensure that any international transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our services are not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
              </p>
              
              <p className="text-muted-foreground leading-relaxed">
                If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may update this privacy policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by:
              </p>
              
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                <li>Posting the updated policy on our website</li>
                <li>Sending email notifications for significant changes</li>
                <li>Updating the "Last updated" date at the top of this policy</li>
              </ul>
              
              <p className="text-muted-foreground leading-relaxed">
                Your continued use of our services after any changes constitutes acceptance of the updated privacy policy.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this privacy policy or our data practices, please contact us:
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-medium mb-4">Data Protection Officer</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Email:</strong> privacy@finetunepc.com</p>
                  <p><strong>Phone:</strong> (555) 123-4567</p>
                  <p><strong>Mail:</strong></p>
                  <p className="ml-4">
                    Fine Tune PC - Privacy Department<br />
                    123 Tech Street<br />
                    Silicon Valley, CA 94000<br />
                    United States
                  </p>
                </div>
              </div>
              
              <p className="text-muted-foreground leading-relaxed mt-4">
                We are committed to resolving any privacy concerns you may have and will respond to your inquiries within 30 days.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
} 