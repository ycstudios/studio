
"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, PlusCircle, Search, Eye, UserCheck, CheckCircle, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Mock data - replace with actual data fetching
const mockClientProjects = [
  { id: "1", name: "E-commerce Platform", status: "In Progress", budget: 5000, proposals: 5, dataAiHint: "online shopping" },
  { id: "2", name: "Mobile App Development", status: "Open", budget: 8000, proposals: 2, dataAiHint: "mobile application" },
  { id: "3", name: "AI Chatbot Integration", status: "Completed", budget: 3000, proposals: 8, dataAiHint: "artificial intelligence" },
];

const mockDeveloperProjects = [
  { id: "4", clientName: "Tech Solutions Inc.", projectName: "Inventory Management System", skills: ["React", "Node.js", "MongoDB"], dataAiHint: "data charts" },
  { id: "5", clientName: "Creative Agency", projectName: "Portfolio Website Redesign", skills: ["Next.js", "TailwindCSS", "Figma"], dataAiHint: "web design" },
];


export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to your Dashboard, {user?.name}!</h1>
          <p className="text-muted-foreground">Here&apos;s an overview of your activities on DevConnect.</p>
        </header>

        {user?.role === "client" && <ClientDashboard />}
        {user?.role === "developer" && <DeveloperDashboard />}
      </div>
    </ProtectedPage>
  );
}

function ClientDashboard() {
  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold">Your Projects</h2>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/projects/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Submit New Project
          </Link>
        </Button>
      </div>
      {mockClientProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockClientProjects.map((project) => (
            <Card key={project.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <CardDescription>Budget: ${project.budget} - Proposals: {project.proposals}</CardDescription>
              </CardHeader>
              <CardContent>
                 <Image 
                    src={`https://placehold.co/600x300.png`}
                    alt={project.name}
                    width={600}
                    height={300}
                    data-ai-hint={project.dataAiHint}
                    className="rounded-md object-cover aspect-video w-full h-auto"
                  />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/projects/${project.id}/matchmaking`}> {/* Assuming a project details page */}
                    <Eye className="mr-2 h-4 w-4" /> View Details & Matches
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 shadow-md">
          <CardHeader>
             <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>No Projects Yet</CardTitle>
            <CardDescription>Start by submitting your first project and let us find the perfect developer for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/projects/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Submit Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  let bgColor = "bg-gray-100 text-gray-800";
  let dotColor = "bg-gray-500";
  if (status === "In Progress") {
    bgColor = "bg-blue-100 text-blue-800";
    dotColor = "bg-blue-500";
  } else if (status === "Open") {
    bgColor = "bg-green-100 text-green-800";
    dotColor = "bg-green-500";
  } else if (status === "Completed") {
    bgColor = "bg-purple-100 text-purple-800";
    dotColor = "bg-purple-500";
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} whitespace-nowrap`}>
      <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor}`} fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
      {status}
    </span>
  );
}


function DeveloperDashboard() {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Matched Projects</h2>
      {mockDeveloperProjects.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockDeveloperProjects.map((project) => (
          <Card key={project.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl">{project.projectName}</CardTitle>
              <CardDescription>From: {project.clientName}</CardDescription>
            </CardHeader>
            <CardContent>
               <Image 
                  src={`https://placehold.co/600x300.png`}
                  alt={project.projectName}
                  width={600}
                  height={300}
                  data-ai-hint={project.dataAiHint}
                  className="rounded-md object-cover aspect-video mb-4 w-full h-auto"
                />
              <p className="text-sm font-medium mb-1">Required Skills:</p>
              <div className="flex flex-wrap gap-2">
                {project.skills.map(skill => (
                  <span key={skill} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">{skill}</span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="default" className="w-full">
                <UserCheck className="mr-2 h-4 w-4" /> View Project & Apply
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      ) : (
      <Card className="text-center py-12 shadow-md">
        <CardHeader>
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle>No Matched Projects Yet</CardTitle>
          <CardDescription>Keep your profile updated. We&apos;ll notify you when suitable projects appear.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/profile">
              Update Your Profile
            </Link>
          </Button>
        </CardContent>
      </Card>
      )}
    </section>
  );
}
