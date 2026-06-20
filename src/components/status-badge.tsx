import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/status";
import type { ProjectStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

// 기본값은 정적 라벨/색상. 서버에서 상태 설정을 읽어 label/colorClass로 덮어쓸 수 있음.
export function StatusBadge({
  status, className, label, colorClass,
}: {
  status: ProjectStatus; className?: string; label?: string; colorClass?: string;
}) {
  return (
    <Badge className={cn(colorClass ?? STATUS_STYLE[status], className)}>
      {label ?? STATUS_LABEL[status]}
    </Badge>
  );
}
