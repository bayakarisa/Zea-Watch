'use client'

import React, { useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp, Mail, Send } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'How do I upload an image for analysis?',
    answer: 'You can upload an image by clicking on the upload area on the home page, or by using the camera capture feature on mobile devices. Supported formats include JPG, PNG, and WebP.',
  },
  {
    question: 'How accurate is the disease detection?',
    answer: 'Our AI model uses a hybrid CNN + Transformer architecture and has been trained on thousands of labeled images. Accuracy varies by disease type, but we typically achieve 85-95% confidence on clear, well-lit images.',
  },
  {
    question: 'What diseases can ZeaWatch detect?',
    answer: 'ZeaWatch can detect common maize leaf diseases including Northern Leaf Blight, Common Rust, Gray Leaf Spot, and healthy leaves. We are continuously adding support for more diseases.',
  },
  {
    question: 'Do I need an account to use ZeaWatch?',
    answer: 'No, you can use ZeaWatch in guest mode without an account. However, creating an account allows you to save your analysis history, access analytics, and sync data across devices.',
  },
  {
    question: 'How do I share an analysis with an agronomist?',
    answer: 'You can generate a shareable link from the history page. Click on any analysis and use the "Share" button to create a view-only link that you can send to agronomists or collaborators.',
  },
  {
    question: 'What is the difference between Free and Premium?',
    answer: 'The Free tier allows 10 analyses per month with basic analytics. Premium offers unlimited analyses, advanced insights, PDF export, priority support, and access to historical trend data.',
  },
  {
    question: 'How do I reset my password?',
    answer: 'Click on "Forgot Password?" on the sign-in page and enter your email address. You will receive an email with instructions to reset your password.',
  },
  {
    question: 'Can I export my analysis data?',
    answer: 'Yes, you can export your analysis history as CSV or JSON from the history page. Premium users can also export individual analyses as PDF reports.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we use industry-standard encryption and security measures. Your images and analysis data are stored securely in Supabase with Row-Level Security policies. You can delete your account and all associated data at any time.',
  },
  {
    question: 'How do I contact support?',
    answer: 'You can contact us at info@zeawatch.site or use the contact form on this page. Premium users receive priority support with faster response times.',
  },
]

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would send this to your backend
    console.log('Contact form submitted:', contactForm)
    setSubmitted(true)
    setContactForm({ name: '', email: '', message: '' })
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Help & Support</h1>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                    {openFAQ === index ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </CardHeader>
                {openFAQ === index && (
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Us Section */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Contact Us</h2>
          <Card>
            <CardHeader>
              <CardTitle>Get in Touch</CardTitle>
              <CardDescription>
                Have a question or need help? Send us a message and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-muted-foreground mb-2">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:info@zeawatch.site"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    info@zeawatch.site
                  </a>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Your message..."
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, message: e.target.value })
                    }
                    required
                  />
                </div>

                {submitted && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
                    Thank you for your message! We'll get back to you soon.
                  </div>
                )}

                <Button type="submit" className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  )
}

