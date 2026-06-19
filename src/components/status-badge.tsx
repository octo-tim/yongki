import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/status";
import type { ProjectStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return <Badge className={cn(STATUS_STYLE[status], className)}>{STATUS_LABEL[status]}</Badge>;
}
