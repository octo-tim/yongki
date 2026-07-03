import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { FaqManager } from "@/components/faq-manager";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const items = await prisma.faqItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">자주묻는질문</h1>
        <p className="text-sm text-muted-foreground">업무 중 자주 나오는 질문과 답변을 Q&A 형식으로 정리합니다</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <FaqManager items={items as any} />
        </CardContent>
      </Card>
    </div>
  );
}
