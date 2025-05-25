
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Briefcase, Link as LinkIcon, Star, FileText, DollarSign } from "lucide-react";
import type { User } from "@/types";
import Link from "next/link";


interface DeveloperCardProps {
  name: string;
  description: string;
  skills?: string[];
  avatarUrl?: string;
  dataAiHint?: string;
  experienceLevel?: User["experienceLevel"];
  hourlyRate?: number;
  portfolioUrls?: string[];
  resumeFileUrl?: string;
  resumeFileName?: string;
  pastProjects?: string;
  developerId?: string;
  matchQuality?: "Strong Fit" | "Moderate Fit" | "Good Fit";
}

export function DeveloperCard({
  name,
  description,
  skills,
  avatarUrl,
  dataAiHint,
  experienceLevel,
  hourlyRate,
  portfolioUrls,
  resumeFileUrl,
  resumeFileName,
  developerId,
  matchQuality
}: DeveloperCardProps) {
  const getInitials = (nameStr: string) => {
    if (!nameStr) return "DV";
    const names = nameStr.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Dev')}&background=random&size=100`;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 pb-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={avatarUrl || defaultAvatar} alt={name} data-ai-hint={dataAiHint || "developer portrait"} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <CardTitle className="text-xl line-clamp-1">{name}</CardTitle>
          {experienceLevel && (
            <CardDescription className="text-xs flex items-center">
              <Briefcase className="h-3 w-3 mr-1 text-muted-foreground" />
              {experienceLevel}
            </CardDescription>
          )}
          {hourlyRate !== undefined && hourlyRate >= 0 && ( // Show if 0 or more
            <CardDescription className="text-xs flex items-center text-primary font-medium">
              <DollarSign className="h-3 w-3 mr-1" />
              ${hourlyRate}/hr
            </CardDescription>
          )}
        </div>
         {matchQuality && (
          <Badge variant={matchQuality === "Strong Fit" ? "default" : "secondary"} className="whitespace-nowrap">
            <Star className="h-3 w-3 mr-1" /> {matchQuality}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 flex-grow pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">{description || "No bio provided."}</p>

        {skills && skills.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Skills</h4>
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 3).map((skill, index) => ( // Show 3 skills initially
                <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
              {skills.length > 3 && <Badge variant="outline" className="text-xs">+{skills.length - 3} more</Badge>}
            </div>
          </div>
        )}

        {portfolioUrls && portfolioUrls.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">Portfolio</h4>
            <a
              href={portfolioUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
            >
              <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{portfolioUrls[0].replace(/^https?:\/\//, '')}</span>
            </a>
          </div>
        )}
        {resumeFileUrl && (
           <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">Resume</h4>
            <a
              href={resumeFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
            >
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{resumeFileName || "View Resume"}</span>
            </a>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {developerId ? (
            <Button variant="default" className="flex-1" asChild>
                <Link href={`/developers/${developerId}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Profile
                </Link>
            </Button>
        ) : ( // This case should ideally not happen if used for AI suggestions without an ID
            <Button variant="default" className="flex-1" disabled>
                <Eye className="mr-2 h-4 w-4" /> View Profile (N/A)
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
