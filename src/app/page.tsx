
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Briefcase, Users, Zap, Target, Search, MessageSquare, ThumbsUp, UserCheck, CircleHelp, ArrowRight, Quote, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BenefitListItem } from "@/components/BenefitListItem";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background text-foreground">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-20 lg:py-28 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  Connect, Collaborate, Create.
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  CodeCrafter is your AI-powered platform to seamlessly match innovative projects with expert freelance developers. Build your vision, faster.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="shadow-lg hover:shadow-primary/30 transition-shadow">
                  <Link href="/signup">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="shadow-sm hover:shadow-md transition-shadow">
                  <Link href="/projects/new">Post a Project</Link>
                </Button>
              </div>
            </div>
            <Image
              src="https://placehold.co/700x500.png"
              width="700"
              height="500"
              alt="Team collaborating on a project"
              data-ai-hint="modern office collaboration"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-2xl transform hover:scale-105 transition-transform duration-300 w-full h-auto"
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
              step="1. Sign Up"
              description="Create your account as a client looking to hire or a developer seeking projects."
            />
            <HowItWorksStep
              icon={<Briefcase className="h-10 w-10 text-primary" />}
              step="2. Post or Find Projects"
              description="Clients post project details. Developers browse opportunities or get matched by our AI."
            />
            <HowItWorksStep
              icon={<Zap className="h-10 w-10 text-primary" />}
              step="3. AI Matchmaking & Facilitated Communication"
              description="Our system connects clients with suitable developers. CodeCrafter then acts as an intermediary to manage communication and project milestones."
            />
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
            <Image
              src="https://placehold.co/600x450.png"
              width="600"
              height="450"
              alt="Client reviewing developer profiles"
              data-ai-hint="client meeting business"
              className="mx-auto rounded-xl object-cover shadow-lg w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* For Developers Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
             <Image
              src="https://placehold.co/600x450.png"
              width="600"
              height="450"
              alt="Developer working on a laptop"
              data-ai-hint="developer coding programming"
              className="mx-auto rounded-xl object-cover shadow-lg lg:order-last w-full h-auto"
            />
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
                Signing up and browsing is free for both clients and developers. We offer various plans for posting projects and accessing premium features. (Note: This is a placeholder, actual pricing model TBD).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg hover:text-primary">How are developers vetted?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We have a verification process that includes portfolio reviews and skill assessments to ensure a high standard of talent on the platform. (Note: This is a placeholder, actual vetting process TBD).
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg hover:text-primary">How does communication work between clients and developers?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                CodeCrafter acts as an intermediary for all communication. Once a potential match is identified or a project proposal is initiated, our platform facilitates the exchange of messages, ensuring a streamlined and managed process. This helps maintain clarity, track progress, and provide support when needed.
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
  avatarHint: string; // For data-ai-hint
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
          <Image 
            src={`https://placehold.co/50x50.png`}
            alt={name} 
            data-ai-hint={avatarHint}
            width={50} 
            height={50} 
            className="rounded-full"
          />
          <div>
            <p className="font-semibold text-sm">{name}</p>
            {/* <p className="text-xs text-muted-foreground">Role, Company</p> */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
