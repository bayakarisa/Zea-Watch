'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

function AboutContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'story'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">About Us</h1>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="story">Our Story</TabsTrigger>
            <TabsTrigger value="evolution">Evolution</TabsTrigger>
            <TabsTrigger value="mission">Mission</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="drive">Drive</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Our Story</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  ZeaWatch was born from a simple observation: farmers needed better tools to
                  detect and manage maize leaf diseases early. What started as a research project
                  has evolved into a comprehensive platform that empowers farmers with AI-powered
                  disease detection technology.
                </p>
                <p className="text-muted-foreground">
                  Our journey began when we witnessed the devastating impact of undetected diseases
                  on crop yields. We knew that with the right technology, we could help farmers
                  identify problems before they spread, ultimately saving crops and livelihoods.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evolution" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>How We Evolved</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  ZeaWatch has evolved from a simple image classification tool to a comprehensive
                  agricultural intelligence platform. We started with basic CNN models and have
                  continuously improved our technology, integrating hybrid CNN + Transformer models
                  for more accurate disease detection.
                </p>
                <p className="text-muted-foreground">
                  Today, ZeaWatch includes advanced features like field mapping, analytics dashboards,
                  collaboration tools, and cloud synchronization. We continue to innovate and add
                  new capabilities based on farmer feedback and agricultural research.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mission" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Our mission is to democratize access to advanced agricultural technology, making
                  AI-powered disease detection accessible to farmers worldwide. We believe that
                  technology should empower, not complicate, and that every farmer deserves access
                  to tools that can help protect their crops and livelihoods.
                </p>
                <p className="text-muted-foreground">
                  We are committed to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Providing accurate, reliable disease detection</li>
                  <li>Making our platform accessible and user-friendly</li>
                  <li>Continuously improving our AI models</li>
                  <li>Supporting sustainable farming practices</li>
                  <li>Protecting farmer data and privacy</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Our Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  ZeaWatch is built by a diverse team of agricultural scientists, AI researchers,
                  software engineers, and UX designers who share a passion for sustainable agriculture
                  and technology innovation.
                </p>
                <p className="text-muted-foreground">
                  Our team brings together expertise in machine learning, plant pathology, full-stack
                  development, and user experience design to create a platform that is both powerful
                  and accessible.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drive" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Our Drive</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  What drives us is the impact we can make on farmers' lives and food security.
                  Every disease we help detect early, every crop we help save, and every farmer
                  we empower motivates us to keep improving.
                </p>
                <p className="text-muted-foreground">
                  We are driven by:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>The potential to reduce crop losses and improve food security</li>
                  <li>The opportunity to make advanced technology accessible to all farmers</li>
                  <li>The challenge of solving complex agricultural problems with AI</li>
                  <li>The satisfaction of seeing farmers succeed with our tools</li>
                  <li>The vision of a more sustainable and productive agricultural future</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impact" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Our Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Since launching, ZeaWatch has helped thousands of farmers detect and manage
                  maize leaf diseases early, potentially saving millions of dollars in crop losses.
                  Our platform has been used to analyze tens of thousands of leaf images, providing
                  farmers with instant, actionable insights.
                </p>
                <p className="text-muted-foreground">
                  We measure our impact not just in numbers, but in the stories of farmers who
                  have been able to protect their crops, improve their yields, and secure their
                  livelihoods thanks to early disease detection.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Terms of Use</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 text-muted-foreground">
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">1. Acceptance of Terms</h3>
                    <p>
                      By accessing and using ZeaWatch, you accept and agree to be bound by the terms
                      and provision of this agreement.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">2. Use License</h3>
                    <p>
                      Permission is granted to temporarily use ZeaWatch for personal, non-commercial
                      transitory viewing only. This is the grant of a license, not a transfer of title.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">3. Disclaimer</h3>
                    <p>
                      The materials on ZeaWatch are provided on an 'as is' basis. ZeaWatch makes no
                      warranties, expressed or implied, and hereby disclaims and negates all other
                      warranties including, without limitation, implied warranties or conditions of
                      merchantability, fitness for a particular purpose, or non-infringement of
                      intellectual property or other violation of rights.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">4. Limitations</h3>
                    <p>
                      In no event shall ZeaWatch or its suppliers be liable for any damages (including,
                      without limitation, damages for loss of data or profit, or due to business interruption)
                      arising out of the use or inability to use the materials on ZeaWatch.
                    </p>
                  </section>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 text-muted-foreground">
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">1. Information We Collect</h3>
                    <p>
                      We collect information that you provide directly to us, including your name,
                      email address, and any images you upload for analysis.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">2. How We Use Your Information</h3>
                    <p>
                      We use the information we collect to provide, maintain, and improve our services,
                      process your analyses, and communicate with you.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">3. Data Security</h3>
                    <p>
                      We implement appropriate security measures to protect your personal information.
                      However, no method of transmission over the Internet is 100% secure.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">4. Your Rights</h3>
                    <p>
                      You have the right to access, update, or delete your personal information at
                      any time through your profile settings or by contacting us.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-foreground mb-2">5. GDPR Compliance</h3>
                    <p>
                      We are committed to complying with GDPR and other data protection regulations.
                      You can export your data or request deletion at any time.
                    </p>
                  </section>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}

export default function AboutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AboutContent />
    </Suspense>
  )
}

