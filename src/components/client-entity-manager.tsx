"use client";
import { EntityManager } from "@/components/entity-manager";
import { ClientPortalAccounts } from "@/components/client-portal-accounts";

// 업체 관리 전용 래퍼: EntityManager 편집 폼 하단에 포털 로그인 정보(아이디·비밀번호) 섹션을 렌더
export function ClientEntityManager(props: React.ComponentProps<typeof EntityManager>) {
  return (
    <EntityManager
      {...props}
      renderEditExtra={(row: any) => (
        <div className="space-y-2">
          <p className="text-sm font-semibold">포털 로그인 정보</p>
          <ClientPortalAccounts clientId={row.id} users={row.clientUsers ?? []} />
        </div>
      )}
    />
  );
}
