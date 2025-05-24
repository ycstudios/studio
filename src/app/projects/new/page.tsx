
"use client";

import { ProjectSubmissionForm } from "@/components/forms/ProjectSubmissionForm";
import { ProtectedPage } from "@/components/ProtectedPage";

export default function NewProjectPage() {
  return (
    <ProtectedPage allowedRoles={["client"]}>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <ProjectSubmissionForm />
      </div>
    </ProtectedPage>
  );
}
