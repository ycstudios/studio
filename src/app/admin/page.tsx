
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Settings,
  Users as UsersIcon,
  Flag, 
  ShieldCheck, 
  ShieldX,
  CheckSquare,
  XSquare,
  UsersRound
} from "lucide-react";
import type { User as UserType, Project, AccountStatus } from "@/types";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAllProjects, toggleUserFlag, addAdminActivityLog, getUserById, updateUserAccountStatus } from "@/lib/firebaseService"; 
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from 'date-fns';
import { Timestamp } from "firebase/firestore";

interface AdminFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string; 
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
  { title: "Smart Request Matching", description: "AI-connects clients to developers. (Future Feature)", link: "#" },
  { title: "Developer Analytics", description: "Track performance, ratings, project history, and engagement metrics. (Placeholder)", link: "#" },
  { title: "Project Monitoring", description: "View ongoing, completed, and pending projects in real-time.", link: "#projects-section" },
  { title: "Request Manager", description: "Accept, reject, or assign service requests. (Future Feature)", link: "#" },
  { title: "Payment Control", description: "Monitor transactions, release payments, handle disputes. (Future Feature)", link: "#" },
  { title: "Notification Center", description: "Real-time alerts for user actions or system events. (Future Feature)", link: "#" },
  { title: "User Management", description: "View, manage, flag, and approve/reject users.", link: "#users-section" },
  { title: "Activity Logs", description: "Track all admin-side actions for transparency.", link: "/admin/activity-logs" }, 
];

const featureIcons = [
  <Brain key="brain" className="h-8 w-8 text-primary flex-shrink-0" />,
  <BarChart3 key="barchart" className="h-8 w-8 text-accent flex-shrink-0" />,
  <KanbanSquare key="kanban" className="h-8 w-8 text-primary flex-shrink-0" />,
  <ClipboardCheck key="clipboard" className="h-8 w-8 text-accent flex-shrink-0" />,
  <Landmark key="landmark" className="h-8 w-8 text-primary flex-shrink-0" />,
  <Bell key="bell" className="h-8 w-8 text-accent flex-shrink-0" />,
  <UsersIcon key="users-icon-feature" className="h-8 w-8 text-primary flex-shrink-0" />,
  <History key="history" className="h-8 w-8 text-accent flex-shrink-0" />,
];


export default function AdminPage() {
  const { user: adminUser, allUsers, isLoading: authLoading, updateSingleUserInList } = useAuth(); 
  const { toast } = useToast();
  const [clients, setClients] = useState<UserType[]>([]);
  const [developers, setDevelopers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsFetchError, setProjectsFetchError] = useState<string | null>(null);
  const [isTogglingFlag, setIsTogglingFlag] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && allUsers) {
      const sortedUsers = [...allUsers].sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds || 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds || 0;
        return dateB - dateA; // Sort descending by date
      });
      setClients(sortedUsers.filter(u => u.role === 'client'));
      setDevelopers(sortedUsers.filter(u => u.role === 'developer'));
    }
  }, [allUsers, authLoading]);

  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectsFetchError(null);
    try {
      const fetchedProjects = await getAllProjects();
      setProjects(fetchedProjects.sort((a,b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds || 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds || 0;
        return dateB - dateA; // Sort descending by date
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Could not retrieve project list."
      setProjectsFetchError(errorMsg);
      toast({title: "Error Fetching Projects", description: errorMsg, variant: "destructive"});
    } finally {
      setIsLoadingProjects(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleToggleFlag = async (userIdToFlag: string, currentStatus: boolean, userName: string) => {
    if (!adminUser) {
      toast({ title: "Authentication Error", description: "Admin user not found.", variant: "destructive" });
      return;
    }
    setIsTogglingFlag(userIdToFlag);
    try {
      await toggleUserFlag(userIdToFlag, currentStatus);
      const action = !currentStatus ? "USER_FLAGGED" : "USER_UNFLAGGED";
      await addAdminActivityLog({
        adminId: adminUser.id,
        adminName: adminUser.name || "Admin",
        action: action,
        targetType: "user",
        targetId: userIdToFlag,
        targetName: userName,
        details: { newFlagStatus: !currentStatus }
      });
      
      const updatedUser = await getUserById(userIdToFlag); 
      if (updatedUser) {
        updateSingleUserInList(updatedUser); 
      }

      toast({
        title: "User Flag Status Updated",
        description: `${userName}'s flag status has been ${!currentStatus ? 'set to flagged' : 'cleared'}.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Could not update user flag status.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsTogglingFlag(null);
    }
  };

  const handleUpdateAccountStatus = async (userIdToUpdate: string, newStatus: AccountStatus, userEmail: string, userName: string) => {
    if (!adminUser) {
      toast({ title: "Authentication Error", description: "Admin user not found.", variant: "destructive" });
      return;
    }
    setIsUpdatingStatus(userIdToUpdate);
    try {
      await updateUserAccountStatus(userIdToUpdate, newStatus, userEmail, userName);
      const action = newStatus === 'active' ? 'DEVELOPER_APPROVED' : 'DEVELOPER_REJECTED';
      await addAdminActivityLog({
        adminId: adminUser.id,
        adminName: adminUser.name || "Admin",
        action: action,
        targetType: "user",
        targetId: userIdToUpdate,
        targetName: userName,
        details: { newAccountStatus: newStatus }
      });
      const updatedUser = await getUserById(userIdToUpdate); 
      if (updatedUser) {
        updateSingleUserInList(updatedUser); 
      }
      toast({
        title: "Account Status Updated",
        description: `${userName}'s account has been ${newStatus === 'active' ? 'approved' : 'rejected'}.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Could not update account status.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const isLoadingInitialData = authLoading || (isLoadingProjects && projects.length === 0 && allUsers.length === 0);

  if (isLoadingInitialData) {
    return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </ProtectedPage>
    );
  }
  
  const hasDataLoadingError = projectsFetchError && allUsers.length === 0; 

  if (hasDataLoadingError) { 
     return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Error Loading Admin Data</h1>
          <p className="text-muted-foreground">
            Could not load essential data for the admin panel. Please try refreshing the page.
            {projectsFetchError && <span className="block mt-2 text-sm">Details: {projectsFetchError}</span>}
          </p>
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
                <UsersRound className="mr-2 h-5 w-5 text-primary" />
                Clients ({authLoading && clients.length === 0 ? <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" /> : clients.length})
              </CardTitle>
              <CardDescription>List of all registered clients. Sorted by most recent join date.</CardDescription>
            </CardHeader>
            <CardContent>
              {authLoading && clients.length === 0 ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> :
               clients.length === 0 ? <p className="text-muted-foreground text-center py-4">No clients found.</p> :
              <UserTable users={clients} onToggleFlag={handleToggleFlag} onUpdateStatus={handleUpdateAccountStatus} isTogglingFlagId={isTogglingFlag} isUpdatingStatusId={isUpdatingStatus} />}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                Developers ({authLoading && developers.length === 0 ? <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" /> : developers.length})
              </CardTitle>
              <CardDescription>List of all registered developers. Sorted by most recent join date.</CardDescription>
            </CardHeader>
            <CardContent>
               {authLoading && developers.length === 0 ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> :
                developers.length === 0 ? <p className="text-muted-foreground text-center py-4">No developers found.</p> :
                <UserTable users={developers} onToggleFlag={handleToggleFlag} onUpdateStatus={handleUpdateAccountStatus} isTogglingFlagId={isTogglingFlag} isUpdatingStatusId={isUpdatingStatus} />}
            </CardContent>
          </Card>
        </div>

        <div id="projects-section">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                All Projects ({isLoadingProjects && projects.length === 0 ? <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" /> : projects.length})
              </CardTitle>
              <CardDescription>Overview of all projects on the platform. Sorted by most recent creation date.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProjects && projects.length === 0 && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {!isLoadingProjects && projectsFetchError && 
                <Alert variant="destructive" className="my-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Loading Projects</AlertTitle>
                  <AlertDescription>{projectsFetchError} Please try refreshing.</AlertDescription>
                </Alert>
              }
              {!isLoadingProjects && !projectsFetchError && projects.length === 0 && <p className="text-muted-foreground text-center py-4">No projects found.</p>}
              {!isLoadingProjects && !projectsFetchError && projects.length > 0 && <ProjectTable projects={projects} allUsers={allUsers} />}
            </CardContent>
          </Card>
        </div>

         {(allUsers.length === 0 && projects.length === 0 && !isLoadingInitialData && !projectsFetchError && !authLoading && !isLoadingProjects) && (
          <Card className="mt-8 shadow-md">
            <CardContent className="p-8 text-center">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Data Found</h3>
              <p className="text-muted-foreground">
                User and project lists are currently empty. Once users sign up and projects are submitted, they will appear here.
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
  onToggleFlag: (userId: string, currentStatus: boolean, userName: string) => void;
  onUpdateStatus: (userId: string, newStatus: AccountStatus, userEmail: string, userName: string) => void;
  isTogglingFlagId: string | null;
  isUpdatingStatusId: string | null;
}

function UserTable({ users, onToggleFlag, onUpdateStatus, isTogglingFlagId, isUpdatingStatusId }: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Flagged</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Skills</TableHead>
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
              <TableCell>
                 <AccountStatusBadge status={user.accountStatus} />
              </TableCell>
              <TableCell>
                {user.isFlagged ? <ShieldX className="h-5 w-5 text-destructive" /> : <ShieldCheck className="h-5 w-5 text-green-500" />}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                 {user.createdAt instanceof Date ? format(user.createdAt, "PP") : (user.createdAt as Timestamp)?.seconds ? format(new Date((user.createdAt as Timestamp).seconds * 1000), "PP") : 'N/A'}
              </TableCell>
              <TableCell className="min-w-[150px] max-w-[300px]">
                {user.role === 'developer' && user.skills && user.skills.length > 0 
                  ? user.skills.slice(0, 3).join(", ") + (user.skills.length > 3 ? `... (+${user.skills.length - 3})` : "")
                  : <span className="text-muted-foreground italic">No skills</span>}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap space-x-2">
                {user.role === 'developer' && user.accountStatus === 'pending_approval' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500 text-green-600 hover:bg-green-500/10"
                      onClick={() => onUpdateStatus(user.id, 'active', user.email, user.name || 'Developer')}
                      disabled={isUpdatingStatusId === user.id}
                      aria-label={`Approve developer ${user.name}`}
                    >
                      {isUpdatingStatusId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                       className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => onUpdateStatus(user.id, 'rejected', user.email, user.name || 'Developer')}
                      disabled={isUpdatingStatusId === user.id}
                      aria-label={`Reject developer ${user.name}`}
                    >
                       {isUpdatingStatusId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XSquare className="mr-2 h-4 w-4" />}
                      Reject
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onToggleFlag(user.id, user.isFlagged || false, user.name || 'Unknown User')}
                  disabled={isTogglingFlagId === user.id}
                  className={user.isFlagged ? "border-destructive text-destructive hover:bg-destructive/10" : ""}
                  aria-label={user.isFlagged ? `Unflag user ${user.name}` : `Flag user ${user.name}`}
                >
                  {isTogglingFlagId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
                  {user.isFlagged ? "Unflag" : "Flag"}
                </Button>
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
  const getClientName = (clientId: string): string => {
    const client = allUsers.find(user => user.id === clientId && user.role === 'client');
    return client ? client.name || "Unnamed Client" : "Unknown Client";
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned Developer</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map(project => (
            <TableRow key={project.id}>
              <TableCell className="font-medium whitespace-nowrap">{project.name}</TableCell>
              <TableCell className="whitespace-nowrap">
                {getClientName(project.clientId)} 
                <span className="text-xs text-muted-foreground ml-1">({project.clientId.substring(0,6)}...)</span>
              </TableCell>
              <TableCell>
                <ProjectStatusBadge status={project.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {project.assignedDeveloperName || <span className="text-muted-foreground italic">Not assigned</span>}
              </TableCell>
               <TableCell className="whitespace-nowrap">
                 {project.createdAt instanceof Date ? formatDistanceToNow(project.createdAt, { addSuffix: true }) : (project.createdAt as Timestamp)?.seconds ? formatDistanceToNow(new Date((project.createdAt as Timestamp).seconds * 1000), { addSuffix: true }) : 'N/A'}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}/matchmaking`}> 
                    <Eye className="mr-2 h-4 w-4" />
                    View/Manage
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
  let dotColor = "bg-gray-500 dark:bg-gray-400";
  let icon = <Clock className="mr-1.5 h-3 w-3" />;
  let currentStatus = status || "Unknown";

  if (currentStatus === "In Progress") {
    bgColor = "bg-blue-500/20 text-blue-700 dark:text-blue-300 dark:bg-blue-700/30";
    dotColor = "bg-blue-500 dark:bg-blue-400";
  } else if (currentStatus === "Open") {
    bgColor = "bg-green-500/20 text-green-700 dark:text-green-300 dark:bg-green-700/30";
    dotColor = "bg-green-500 dark:bg-green-400";
    icon = <Eye className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Completed") {
    bgColor = "bg-purple-500/20 text-purple-700 dark:text-purple-300 dark:bg-purple-700/30";
    dotColor = "bg-purple-500 dark:bg-purple-400";
    icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Cancelled") {
    bgColor = "bg-red-500/20 text-red-700 dark:text-red-300 dark:bg-red-700/30";
    dotColor = "bg-red-500 dark:bg-red-400";
    icon = <Info className="mr-1.5 h-3 w-3" />;
  } else { 
     bgColor = "bg-gray-500/20 text-gray-700 dark:text-gray-300 dark:bg-gray-700/30";
     dotColor = "bg-gray-500 dark:bg-gray-400";
     currentStatus = "Unknown";
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

function AccountStatusBadge({ status }: { status?: UserType["accountStatus"] }) {
  let bgColor = "bg-muted text-muted-foreground";
  let icon = <Clock className="mr-1.5 h-3 w-3" />;
  let currentStatus = status || "unknown";
  let capitalizedStatus = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1).replace(/_/g, ' ');


  if (currentStatus === "active") {
    bgColor = "bg-green-500/20 text-green-700 dark:text-green-300 dark:bg-green-700/30";
    icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "pending_approval") {
    bgColor = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 dark:bg-yellow-700/30";
    icon = <Clock className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "rejected") {
    bgColor = "bg-red-500/20 text-red-700 dark:text-red-300 dark:bg-red-700/30";
    icon = <XSquare className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "suspended") {
    bgColor = "bg-orange-500/20 text-orange-700 dark:text-orange-300 dark:bg-orange-700/30";
    icon = <ShieldAlert className="mr-1.5 h-3 w-3" />;
  } else { 
     bgColor = "bg-gray-500/20 text-gray-700 dark:text-gray-300 dark:bg-gray-700/30";
     icon = <Info className="mr-1.5 h-3 w-3" />;
     capitalizedStatus = "Unknown";
  }

  return (
    <Badge variant="outline" className={`border-transparent ${bgColor}`}>
      {icon}
      {capitalizedStatus}
    </Badge>
  );
}

