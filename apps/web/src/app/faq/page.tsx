import { SiteHeader, SiteFooter } from '@/components/layout';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is myVote Kenya?',
        a: 'myVote Kenya is a digital platform that empowers Kenyan citizens to participate actively in democracy. You can follow candidates, participate in opinion polls, track election results in real-time, and stay informed about electoral activities in your constituency.',
      },
      {
        q: 'Is myVote Kenya free to use?',
        a: 'Yes! Creating an account and accessing basic features like following candidates, viewing opinion polls, and tracking results is completely free.',
      },
      {
        q: 'How do I create an account?',
        a: 'You can create an account by clicking "Get Started" on the homepage. You\'ll need a valid Kenyan phone number to register. We\'ll send you an OTP to verify your number.',
      },
      {
        q: 'Can I use myVote Kenya without a smartphone?',
        a: 'Yes! You can access key features via USSD on any phone. Simply dial the USSD code displayed on our platform to access candidate information, polls, and results without internet.',
      },
    ],
  },
  {
    category: 'Candidates & Polls',
    questions: [
      {
        q: 'How do I follow a candidate?',
        a: 'Navigate to the Candidates page, find the candidate you\'re interested in, and click the "Follow" button. You\'ll receive updates about their campaign activities.',
      },
      {
        q: 'How are opinion poll results calculated?',
        a: 'Opinion poll results are calculated based on votes from verified users. Each user can vote once per poll. Results are displayed as percentages and updated in real-time.',
      },
      {
        q: 'Can I create my own opinion poll?',
        a: 'Currently, opinion polls are created by verified candidates and administrators. If you\'re a registered candidate, you can create polls from your candidate dashboard.',
      },
      {
        q: 'How do I register as a candidate?',
        a: 'To register as a candidate, create an account first, then navigate to the Candidate Portal from your dashboard. You\'ll need to provide your political party affiliation and the position you\'re vying for.',
      },
    ],
  },
  {
    category: 'Agents & Election Day',
    questions: [
      {
        q: 'What is an election agent?',
        a: 'An election agent is a representative appointed by a candidate to observe voting and counting at a specific polling station. Agents can report results and issues through the platform.',
      },
      {
        q: 'How do I become an agent?',
        a: 'Agents are invited by candidates through the platform. If a candidate sends you an invitation, you\'ll receive an SMS with a link to accept and set up your agent account.',
      },
      {
        q: 'How are election results reported?',
        a: 'On election day, verified agents at polling stations submit results through the platform. Results are aggregated from polling station level up to constituency, county, and national levels.',
      },
    ],
  },
  {
    category: 'Account & Security',
    questions: [
      {
        q: 'How is my data protected?',
        a: 'We take data protection seriously. All personal data is encrypted, and we comply with Kenya\'s Data Protection Act. We never share your personal information with third parties without your consent.',
      },
      {
        q: 'I forgot my password / can\'t log in',
        a: 'You can log in using OTP (One-Time Password) sent to your registered phone number. If you\'re still having trouble, contact our support team via WhatsApp or email.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes, you can request account deletion by contacting our support team. We\'ll process your request within 48 hours and delete all your personal data.',
      },
    ],
  },
  {
    category: 'Payments & Wallet',
    questions: [
      {
        q: 'What is the myVote Wallet?',
        a: 'The myVote Wallet allows candidates to manage payments for agents, campaign services, and platform fees. You can top up via M-Pesa and withdraw to your M-Pesa account.',
      },
      {
        q: 'How do I top up my wallet?',
        a: 'Navigate to your Wallet in the dashboard, click "Top Up", enter the amount, and complete the payment via M-Pesa. The funds will reflect in your wallet within seconds.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 lg:py-24">
          <div className="container max-w-4xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-lg text-muted-foreground">
                Find answers to common questions about myVote Kenya.
              </p>
            </div>

            <div className="space-y-10">
              {faqs.map((section) => (
                <div key={section.category}>
                  <h2 className="text-2xl font-semibold mb-6 text-primary">{section.category}</h2>
                  <div className="space-y-4">
                    {section.questions.map((faq, i) => (
                      <details
                        key={i}
                        className="group rounded-lg border bg-card p-4 shadow-sm"
                      >
                        <summary className="flex cursor-pointer items-center justify-between font-medium">
                          {faq.q}
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-3 text-muted-foreground leading-relaxed">
                          {faq.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center rounded-lg border bg-muted/50 p-8">
              <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-4">
                Our support team is here to help you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://wa.me/254733638940"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  Chat on WhatsApp
                </a>
                <a
                  href="mailto:support@keyvote.online"
                  className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
