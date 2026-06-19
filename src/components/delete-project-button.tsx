"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  async function del() {
    if (!confirm("이 프로젝트를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/projects");
    router.refresh();
  }
  return <Button variant="outline" onClick={del} className="text-destructive"><Trash2 className="h-4 w-4" /> 삭제</Button>;
}
