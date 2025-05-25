
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Briefcase, Users, Zap, Target, Search, MessageSquare, ThumbsUp, UserCheck, CircleHelp, ArrowRight, Quote, UserPlus, Lightbulb } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BenefitListItem } from "@/components/BenefitListItem";
import { ImageCarousel } from "@/components/ImageCarousel";
import { QuickServiceRequestForm } from "@/components/forms/QuickServiceRequestForm";

const clientCarouselImages = [
  { src: "https://www.dropbox.com/scl/fi/tf9c4m5q307qb45r6w62n/1.png?rlkey=ucr5x9pen2ndl58grawxul7xt&st=w1y9w892&dl=1", alt: "Client reviewing project proposals", dataAiHint: "client meeting business" },
  { src: "https://www.dropbox.com/scl/fi/run6pj80rnyg4c2v8p4i0/5.png?rlkey=dv9nrkq0xw8owctqeyi4oam7l&st=5hxq3ua7&dl=1", alt: "Team planning a project", dataAiHint: "project planning team" },
  { src: "https://www.dropbox.com/scl/fi/zbnylk1b43itu41n38f8p/3.png?rlkey=2khyq20q6wa0xpu4inu8oftny&st=khxa8r72&dl=1", alt: "Successful project launch presentation", dataAiHint: "successful presentation" },
];

const developerCarouselImages = [
  { src: "https://www.dropbox.com/scl/fi/z32zfcmqttj3x4uw7wmfp/4.png?rlkey=dhhd1ruga8j2p59g1m49gsec1&st=ygiv7hmu&dl=1", alt: "Developer coding on a laptop", dataAiHint: "developer coding programming" },
  { src: "https://www.dropbox.com/scl/fi/t0dwobaqyivouil5eimb0/2.png?rlkey=zo3fimsbeaet5i5a9evkrvmgi&st=xrii6zvv&dl=1", alt: "Focused developer coding", dataAiHint: "focused developer code" },
  { src: "https://www.dropbox.com/scl/fi/oy34qipt9kq4ba7y4snbo/WhatsApp-Image-2025-05-20-at-10.14.51-PM.jpeg?rlkey=whc93wr321i8uvi4s958ozueq&st=t7876qd1&dl=1", alt: "Collaborative coding pair", dataAiHint: "collaborative coding pair" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background text-foreground">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-20 lg:py-28 bg-gradient-to-br from-primary/10 via-background to-accent/10 overflow-hidden">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="flex flex-col justify-center space-y-6 animate-in fade-in slide-in-from-left-12 duration-700">
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent animate-in fade-in-0 slide-in-from-bottom-10 duration-1000 delay-300">
                  Connect, Collaborate, Create.
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl animate-in fade-in-0 slide-in-from-bottom-10 duration-1000 delay-500">
                  CodeCrafter is your AI-powered platform to seamlessly match innovative projects with expert freelance developers. Build your vision, faster.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row animate-in fade-in-0 slide-in-from-bottom-10 duration-1000 delay-700">
                <Button size="lg" asChild className="shadow-lg hover:shadow-primary/30 transition-shadow">
                  <Link href="/signup">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="shadow-sm hover:shadow-md transition-shadow">
                  <Link href="/projects/new">Post a Project</Link>
                </Button>
              </div>
            </div>
            <Image
              src="https://www.dropbox.com/scl/fi/0i84baa0fg3n38bm2j0tc/7.png?rlkey=88j8yfjrgnhmqo92l79cn126a&st=hyclirml&dl=1"
              width={500}
              height={400}
              alt="Team collaborating on a project"
              data-ai-hint="modern office collaboration"
              className="mx-auto rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-300 w-full h-auto max-w-[500px] max-h-[400px] animate-in fade-in zoom-in-90 duration-700 delay-200 object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="inline-block rounded-lg bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">How CodeCrafter Works</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Simple Steps to Success</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg">
              We've streamlined the process so you can focus on what matters most.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            <HowItWorksStep
              icon={<UserPlus className="h-10 w-10 text-primary" />}
              step="1. Sign Up or Quick Request"
              description="Create an account or submit a quick service request to get started. We cater to both detailed project submissions and initial inquiries."
            />
            <HowItWorksStep
              icon={<Briefcase className="h-10 w-10 text-primary" />}
              step="2. Define Your Needs"
              description="Clients post project details or discuss requirements with our team. Developers showcase their skills and browse opportunities."
            />
            <HowItWorksStep
              icon={<Zap className="h-10 w-10 text-primary" />}
              step="3. AI Matchmaking & Facilitated Communication"
              description="Our system connects clients with suitable developers. CodeCrafter then acts as an intermediary to manage communication and project milestones."
            />
          </div>
        </div>
      </section>
      
      {/* Quick Service Request Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-accent/5 via-background to-primary/5">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block rounded-lg bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-2">Quick Start</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Have a Project Idea? Let's Chat!</h2>
              <p className="text-muted-foreground md:text-lg">
                No account needed to get started. Just fill out this quick form with your project idea, and our team will reach out to help you define the scope and find the perfect developer.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <BenefitListItem icon={<Lightbulb className="text-accent" />} text="Get expert advice on refining your project concept."/>
                <BenefitListItem icon={<Search className="text-accent" />} text="We'll help identify key skills needed for your success."/>
                <BenefitListItem icon={<Users className="text-accent" />} text="Access our curated network of vetted developers."/>
              </ul>
            </div>
            <Card className="shadow-xl p-6 sm:p-8">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="text-2xl">Submit Your Quick Request</CardTitle>
                <CardDescription>We'll be in touch within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <QuickServiceRequestForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* For Clients Section */}
      <section className="w-full py-16 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block rounded-lg bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-4">For Clients</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-6">Find Your Perfect Developer, Stress-Free</h2>
              <p className="text-muted-foreground md:text-lg mb-8">
                Stop sifting through endless profiles. CodeCrafter brings top-tier talent directly to you, tailored to your project's unique requirements, and facilitates all interactions.
              </p>
              <ul className="space-y-4">
                <BenefitListItem icon={<Target className="text-accent" />} text="AI-Powered Matching: Get precise developer recommendations." />
                <BenefitListItem icon={<Search className="text-accent" />} text="Access Vetted Talent: Connect with skilled and reliable professionals." />
                <BenefitListItem icon={<MessageSquare className="text-accent" />} text="Facilitated Communication: We manage communication to ensure clarity and progress." />
              </ul>
              <Button size="lg" asChild className="mt-8">
                <Link href="/projects/new">Post Your Project <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
            <ImageCarousel images={clientCarouselImages} className="mx-auto w-full h-auto" />
          </div>
        </div>
      </section>

      {/* For Developers Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
             <ImageCarousel images={developerCarouselImages} className="mx-auto w-full h-auto lg:order-last" />
            <div>
              <div className="inline-block rounded-lg bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent mb-4">For Developers</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-6">Land Exciting Projects That Match Your Skills</h2>
              <p className="text-muted-foreground md:text-lg mb-8">
                Focus on what you do best – coding. CodeCrafter brings you relevant project opportunities and handles client communication, so you can build amazing things.
              </p>
              <ul className="space-y-4">
                <BenefitListItem icon={<UserCheck className="text-primary" />} text="Curated Opportunities: Find projects aligned with your expertise." />
                <BenefitListItem icon={<Zap className="text-primary" />} text="AI-Assisted Matching: Get noticed for your unique talents." />
                <BenefitListItem icon={<ThumbsUp className="text-primary" />} text="Build Your Portfolio: Work on diverse projects and grow your career with our support." />
              </ul>
              <Button size="lg" asChild className="mt-8">
                <Link href="/signup">Join as a Developer <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-16 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="inline-block rounded-lg bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">What Our Users Say</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Trusted by Innovators and Builders</h2>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            <TestimonialCard
              quote="CodeCrafter's AI matchmaking was spot on! Found the perfect developer for my startup in days, not weeks. The facilitated communication made everything smooth."
              name="Sarah L., CEO of TechBloom"
              avatarHint="female ceo portrait"
            />
            <TestimonialCard
              quote="As a developer, I love how CodeCrafter brings relevant projects to me and handles the initial client interactions. It's saved me so much time."
              name="Mike R., Full-Stack Developer"
              avatarHint="male developer happy"
            />
            <TestimonialCard
              quote="The platform is intuitive and made the hiring process incredibly smooth. Having CodeCrafter manage communications was a huge plus. Highly recommend!"
              name="Jessica P., Project Manager at Innovate Inc."
              avatarHint="female manager professional"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/30">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <CircleHelp className="h-12 w-12 text-primary" />
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg hover:text-primary">How does the AI matchmaking work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Our AI analyzes project requirements, desired skills, budget, and timeline, then matches them against developer profiles, skills, experience, and availability to provide the most relevant connections.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg hover:text-primary">Is CodeCrafter free to use?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Signing up and browsing is free for both clients and developers. For clients submitting projects via the full form, and for developers applying to projects, we operate on a success-based commission model. Quick service requests from the landing page are free for initial consultation. Detailed pricing will be available soon.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg hover:text-primary">How are developers vetted?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Developers undergo an approval process where admins review their submitted profile information, including skills, experience, portfolio links, and resumes. This helps ensure a baseline quality of talent on the platform.
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg hover:text-primary">How does communication work between clients and developers?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                CodeCrafter acts as an intermediary for all communication. Once a potential match is identified or a project proposal is initiated, our platform facilitates the exchange of messages, ensuring a streamlined and managed process. This helps maintain clarity, track progress, and provide support when needed. Users can also contact our support team via the live chat widget.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full py-16 md:py-24 lg:py-32">
        <div className="container grid items-center justify-center gap-6 px-4 text-center md:px-6">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Ready to Build Your Next Big Thing?
            </h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              Join CodeCrafter today. Whether you're a client with an idea or a developer ready for your next challenge, we're here to make the connection.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-3 sm:flex sm:flex-row sm:space-y-0 sm:space-x-4 sm:justify-center">
             <Button size="lg" asChild className="w-full sm:w-auto shadow-lg hover:shadow-primary/40 transition-shadow">
                <Link href="/signup">Sign Up - It's Free!</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow">
                <Link href="/projects/new">Post a Project</Link>
              </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

interface HowItWorksStepProps {
  icon: React.ReactNode;
  step: string;
  description: string;
}

function HowItWorksStep({ icon, step, description }: HowItWorksStepProps) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="p-4 bg-primary/10 rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{step}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

interface TestimonialCardProps {
  quote: string;
  name: string;
  avatarHint: string; 
}

function TestimonialCard({ quote, name, avatarHint }: TestimonialCardProps) {
  return (
    <Card className="text-left shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="pb-4">
         <Quote className="h-8 w-8 text-primary/50 mb-2" />
        <CardDescription className="italic text-base text-foreground/80">&quot;{quote}&quot;</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-end pt-2">
        <div className="flex items-center space-x-3">
           {/* Placeholder for avatar image or initials */}
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center ring-2 ring-primary/30">
            <span className="text-lg font-semibold text-primary">
                {name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm">{name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
