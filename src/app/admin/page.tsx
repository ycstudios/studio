
"use client";

import React, { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Briefcase, 
  ShieldAlert, 
  Eye, 
  Loader2, 
  Info, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Brain,
  BarChart3,
  KanbanSquare,
  ClipboardCheck,
  Landmark,
  Bell,
  History,
  ArrowRight,
  Settings
} from "lucide-react";
import type { User as UserType, Project } from "@/types";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAllProjects } from "@/lib/firebaseService"; 
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

interface AdminFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string; // Optional link for the "Manage" button
  accentColor?: 'primary' | 'accent';
}

function AdminFeatureCard({ icon, title, description, link = "#", accentColor = 'primary' }: AdminFeatureCardProps) {
  return (
    <Card className={`shadow-lg hover:shadow-${accentColor}/30 border border-transparent hover:border-${accentColor} transition-all duration-300 transform hover:-translate-y-1 flex flex-col`}>
      <CardHeader className="flex flex-row items-start gap-4 pb-3">
        {icon}
        <CardTitle className="text-lg font-semibold mt-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" className={`ml-auto text-${accentColor} hover:text-${accentColor}/80 group`} asChild>
          <Link href={link}>
            Manage
            <ArrowRight className={`ml-2 h-4 w-4 transition-transform group-hover:translate-x-1`} />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

const adminFeatures: Omit<AdminFeatureCardProps, 'icon' | 'accentColor'>[] = [
  { title: "Smart Request Matching", description: "Auto-connect clients to the best-fit developers using tags and pricing.", link: "#" },
  { title: "Developer Analytics", description: "Track performance, ratings, and project history.", link: "#" },
  { title: "Project Monitoring", description: "View ongoing, completed, and pending projects in real-time.", link: "#projects-section" },
  { title: "Request Manager", description: "Accept, reject, or assign service requests to developers.", link: "#" },
  { title: "Payment Control", description: "Monitor transactions, release payments, handle disputes.", link: "#" },
  { title: "Notification Center", description: "Real-time alerts for user actions or system events.", link: "#" },
  { title: "User Management", description: "View and manage all clients and developers.", link: "#users-section" },
  { title: "Activity Logs", description: "Track all admin-side actions for transparency.", link: "#" },
];

const featureIcons = [
  <Brain key="brain" className="h-8 w-8 text-primary flex-shrink-0" />,
  <BarChart3 key="barchart" className="h-8 w-8 text-accent flex-shrink-0" />,
  <KanbanSquare key="kanban" className="h-8 w-8 text-primary flex-shrink-0" />,
  <ClipboardCheck key="clipboard" className="h-8 w-8 text-accent flex-shrink-0" />,
  <Landmark key="landmark" className="h-8 w-8 text-primary flex-shrink-0" />,
  <Bell key="bell" className="h-8 w-8 text-accent flex-shrink-0" />,
  <Users key="users-icon" className="h-8 w-8 text-primary flex-shrink-0" />, // Users is already imported for tables, using new key
  <History key="history" className="h-8 w-8 text-accent flex-shrink-0" />,
];


export default function AdminPage() {
  const { allUsers, isLoading: authLoading } = useAuth(); 
  const { toast } = useToast();
  const [clients, setClients] = useState<UserType[]>([]);
  const [developers, setDevelopers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && allUsers) {
      setClients(allUsers.filter(u => u.role === 'client'));
      setDevelopers(allUsers.filter(u => u.role === 'developer'));
    }
  }, [allUsers, authLoading]);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      setFetchError(null);
      try {
        const fetchedProjects = await getAllProjects();
        setProjects(fetchedProjects);
      } catch (error) {
        console.error("Failed to fetch projects for admin:", error);
        const errorMsg = error instanceof Error ? error.message : "Could not retrieve project list."
        setFetchError(errorMsg);
        toast({
          title: "Error Fetching Projects",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [toast]);

  const isLoading = authLoading || isLoadingProjects;

  if (isLoading) {
    return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading admin data from database...</p>
        </div>
      </ProtectedPage>
    );
  }
  
  if (fetchError && projects.length === 0 && clients.length === 0 && developers.length === 0) { 
     return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Error Loading Admin Data</h1>
          <p className="text-muted-foreground">{fetchError}</p>
        </div>
      </ProtectedPage>
    );
  }


  return (
    <ProtectedPage allowedRoles={["admin"]}>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <ShieldAlert className="mr-3 h-8 w-8 text-primary" />
            CodeCrafter Admin Panel
          </h1>
          <p className="text-muted-foreground">Oversee platform operations, manage users, and monitor projects.</p>
        </header>

        {/* Core Admin Features Section */}
        <section className="mb-12">
          <div className="flex items-center mb-6 gap-3">
             <Settings className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Core Admin Features</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {adminFeatures.map((feature, index) => (
              <AdminFeatureCard
                key={feature.title}
                icon={featureIcons[index]}
                title={feature.title}
                description={feature.description}
                link={feature.link}
                accentColor={index % 2 === 0 ? 'primary' : 'accent'}
              />
            ))}
          </div>
        </section>
        
        <div id="users-section" className="grid grid-cols-1 gap-8 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Briefcase className="mr-2 h-5 w-5 text-primary" />
                Clients ({clients.length})
              </CardTitle>
              <CardDescription>List of all registered clients.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable users={clients} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                Developers ({developers.length})
              </CardTitle>
              <CardDescription>List of all registered developers.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable users={developers} />
            </CardContent>
          </Card>
        </div>

        <div id="projects-section">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                All Projects ({projects.length})
              </CardTitle>
              <CardDescription>Overview of all projects submitted on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {fetchError && projects.length === 0 && <p className="text-destructive mb-4">Error loading projects: {fetchError}</p>}
              <ProjectTable projects={projects} allUsers={allUsers} />
            </CardContent>
          </Card>
        </div>

         {(allUsers.length === 0 && projects.length === 0 && !isLoading && !fetchError) && (
          <Card className="mt-8 shadow-md">
            <CardContent className="p-8 text-center">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Data Found in Database</h3>
              <p className="text-muted-foreground">
                The user and project lists from Firestore are currently empty. Once users sign up and projects are submitted, they will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}

interface UserTableProps {
  users: UserType[];
}

function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No users in this category found in the database.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {users.length > 0 && users[0]?.role === 'developer' && <TableHead>Skills</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell className="font-medium whitespace-nowrap">{user.name || "N/A"}</TableCell>
              <TableCell className="whitespace-nowrap">{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "destructive" : user.role === "client" ? "secondary" : "default"}>
                  {user.role}
                </Badge>
              </TableCell>
              {user.role === 'developer' && (
                <TableCell>
                  {user.skills && user.skills.length > 0 
                    ? user.skills.join(", ") 
                    : <span className="text-muted-foreground italic">No skills listed</span>}
                </TableCell>
              )}
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/users/${user.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


interface ProjectTableProps {
  projects: Project[];
  allUsers: UserType[]; 
}

function ProjectTable({ projects, allUsers }: ProjectTableProps) {
  if (projects.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No projects found in the database.</p>;
  }

  const getClientName = (clientId: string) => {
    const client = allUsers.find(user => user.id === clientId && user.role === 'client');
    return client ? client.name : "Unknown Client";
  };


  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map(project => (
            <TableRow key={project.id}>
              <TableCell className="font-medium whitespace-nowrap">{project.name}</TableCell>
              <TableCell className="whitespace-nowrap">{getClientName(project.clientId)} ({project.clientId.substring(0,6)}...)</TableCell>
              <TableCell>
                <ProjectStatusBadge status={project.status} />
              </TableCell>
               <TableCell className="whitespace-nowrap">
                 {project.createdAt ? formatDistanceToNow(project.createdAt instanceof Date ? project.createdAt : new Date( (project.createdAt as any).seconds * 1000 ), { addSuffix: true }) : 'N/A'}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}/matchmaking`}> 
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status?: Project["status"] }) {
  let bgColor = "bg-muted text-muted-foreground";
  let dotColor = "bg-gray-500";
  let icon = <Clock className="mr-1.5 h-3 w-3" />;
  let currentStatus = status || "Unknown";


  if (currentStatus === "In Progress") {
    bgColor = "bg-blue-500/20 text-blue-700 dark:text-blue-300";
    dotColor = "bg-blue-500";
  } else if (currentStatus === "Open") {
    bgColor = "bg-green-500/20 text-green-700 dark:text-green-300";
    dotColor = "bg-green-500";
    icon = <Eye className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Completed") {
    bgColor = "bg-purple-500/20 text-purple-700 dark:text-purple-300";
    dotColor = "bg-purple-500";
    icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Cancelled") {
    bgColor = "bg-red-500/20 text-red-700 dark:text-red-300";
    dotColor = "bg-red-500";
    icon = <Info className="mr-1.5 h-3 w-3" />;
  }


  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} whitespace-nowrap`}>
      <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor} hidden sm:block`} fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
      {icon}
      {currentStatus}
    </span>
  );
}


