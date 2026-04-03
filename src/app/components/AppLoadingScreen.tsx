import { Card, CardContent } from "../../components/ui/card";

export function AppLoadingScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="py-16 text-center">서비스 데이터를 불러오는 중...</CardContent>
      </Card>
    </div>
  );
}
