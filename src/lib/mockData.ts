
import type { User as UserType } from "@/types";

export const mockClients: UserType[] = [
  { id: "client1", name: "Alice Johnson", email: "alice.j@example.com", role: "client", avatarUrl: "https://placehold.co/40x40.png?text=AJ", bio: "Looking for web dev services for my startup focused on sustainable products.", accountStatus: "active" },
  { id: "client2", name: "Bob Williams", email: "bob.w@example.net", role: "client", avatarUrl: "https://placehold.co/40x40.png?text=BW", bio: "Needs a portfolio website for his photography business.", accountStatus: "active" },
  { id: "client3", name: "Carol Davis", email: "carol.d@example.org", role: "client", avatarUrl: "https://placehold.co/40x40.png?text=CD", bio: "Wants to build a community platform for local artists.", accountStatus: "active" },
];

export const mockDevelopers: UserType[] = [
  { id: "dev1", name: "David Lee", email: "david.lee@example.dev", role: "developer", avatarUrl: "https://placehold.co/40x40.png?text=DL", skills: ["React", "Node.js", "GraphQL"], bio: "Full-stack developer with a passion for creating scalable web applications.", accountStatus: "active" },
  { id: "dev2", name: "Eva Chen", email: "eva.c@example.dev", role: "developer", avatarUrl: "https://placehold.co/40x40.png?text=EC", skills: ["Python", "Django", "AWS"], bio: "Backend specialist with experience in cloud infrastructure and data analysis.", accountStatus: "active" },
  { id: "dev3", name: "Frank Miller", email: "frank.m@example.dev", role: "developer", avatarUrl: "https://placehold.co/40x40.png?text=FM", skills: ["Vue.js", "Firebase", "TypeScript"], bio: "Frontend enthusiast who enjoys crafting beautiful and intuitive user interfaces.", accountStatus: "active" },
];

export const allMockUsers: UserType[] = [...mockClients, ...mockDevelopers];
