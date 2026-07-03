import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { LibraryManager } from "@/components/library-manager";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const docs = await prisma.libraryDoc.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, category: true, fileName: true, fileType: true, fileSize: true, createdAt: true, uploader: { select: { name: true } } },
  });

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">자료실</h1>
        <p className="text-sm text-muted-foreground">출고서식·샘플서식·영수증 등 공용 자료를 보관합니다</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <LibraryManager docs={docs as any} />
        </CardContent>
      </Card>
    </div>
  );
}
