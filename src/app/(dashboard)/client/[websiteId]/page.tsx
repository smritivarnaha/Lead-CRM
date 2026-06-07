"use client";

import { PipelineView } from "@/components/leads/PipelineView";
import { useParams } from "next/navigation";

export default function ClientPipelinePage() {
  const params = useParams();
  const websiteId = params.websiteId as string;

  if (!websiteId) return null;

  return <PipelineView websiteId={websiteId} />;
}
