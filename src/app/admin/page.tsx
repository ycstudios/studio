
"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Briefcase, ShieldAlert, Eye } from "lucide-react";
import type { User as UserType } from "@/types";
import { mockClients, mockDevelopers } from "@/lib/mockData"; // Import mock data
import Link from "next/link";

export default function AdminPage() {
  return (
    <ProtectedPage allowedRoles={["admin"]}>
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <ShieldAlert className="mr-3 h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users and platform settings.</p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Briefcase className="mr-2 h-5 w-5 text-primary" />
                Clients ({mockClients.length})
              </CardTitle>
              <CardDescription>List of all registered clients.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable users={mockClients} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                Developers ({mockDevelopers.length})
              </CardTitle>
              <CardDescription>List of all registered developers.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable users={mockDevelopers} />
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedPage>
  );
}

interface UserTableProps {
  users: UserType[];
}

function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No users in this category yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          {users[0]?.role === 'developer' && <TableHead>Skills</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
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
            <TableCell className="text-right">
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
  );
}
