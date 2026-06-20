"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/searchable-select";

export function ProjectEntityPicker({ projectId, field, value, options }: {
  projectId: string;
  field: "clientId" | "factoryId";
  value: string | null;
  options: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(id: string) {
    setBusy(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: id || null }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <SearchableSelect
      options={options}
      value={value ?? ""}
      onChange={change}
      placeholder="검색·선택"
      className={busy ? "pointer-events-none opacity-60" : ""}
    />
  );
}
