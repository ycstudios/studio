import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, UserCheck } from "lucide-react";

interface DeveloperCardProps {
  name: string;
  description: string; // This is the AI output string
  skills?: string[]; // Optional, if we can parse or have them separately
  availability?: string;
  timezone?: string;
  avatarUrl?: string;
  dataAiHint?: string;
}

export function DeveloperCard({ name, description, skills, availability, timezone, avatarUrl, dataAiHint }: DeveloperCardProps) {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl || `https://placehold.co/100x100.png`} alt={name} data-ai-hint={dataAiHint || "developer portrait"} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-xl">{name}</CardTitle>
          {/* If description from AI is short, it can be CardDescription. Otherwise, in CardContent */}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
        {skills && skills.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Skills</h4>
            <div className="flex flex-wrap gap-1">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </div>
        )}
        {availability && <p className="text-sm"><span className="font-semibold">Availability:</span> {availability}</p>}
        {timezone && <p className="text-sm"><span className="font-semibold">Timezone:</span> {timezone}</p>}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="default" className="flex-1">
          <UserCheck className="mr-2 h-4 w-4" /> View Profile
        </Button>
        <Button variant="outline" className="flex-1">
          <MessageSquare className="mr-2 h-4 w-4" /> Contact Developer
        </Button>
      </CardFooter>
    </Card>
  );
}
