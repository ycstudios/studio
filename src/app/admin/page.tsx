
"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Briefcase, ShieldAlert, Eye, Loader2, Info } from "lucide-react";
import type { User as UserType } from "@/types";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const { allUsers, isLoading: authLoading } = useAuth(); 
  const [clients, setClients] = useState<UserType[]>([]);
  const [developers, setDevelopers] = useState<UserType[]>([]);

  useEffect(() => {
    if (!authLoading && allUsers) {
      setClients(allUsers.filter(u => u.role === 'client'));
      setDevelopers(allUsers.filter(u => u.role === 'developer'));
    }
  }, [allUsers, authLoading]);

  if (authLoading) {
    return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading users from database...</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage allowedRoles={["admin"]}>
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <ShieldAlert className="mr-3 h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users registered on the platform (data from Firestore).</p>
        </header>

        <div className="grid grid-cols-1 gap-8">
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
         {allUsers.length === 0 && !authLoading && (
          <Card className="mt-8 shadow-md">
            <CardContent className="p-8 text-center">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Users Found in Database</h3>
              <p className="text-muted-foreground">
                The user list from Firestore is currently empty. Once users sign up, they will appear here.
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
              <TableCell className="font-medium whitespace-nowrap">{user.name}</TableCell>
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
