import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { User, ArrowLeft } from "lucide-react";
import seoulMetroLogo from "../assets/logo.png"; // 타입 선언 추가 필요

interface UserLoginProps {
  onLogin: (user: { employeeId: string; name: string }) => void;
  onBack: () => void;
}

export function UserLogin({ onLogin, onBack }: UserLoginProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 사번 유효성 검사 (2로 시작하는 8자리 숫자)
  const validateEmployeeId = (id: string) => {
    const regex = /^2\d{7}$/;
    return regex.test(id);
  };

  // 한글 이름 유효성 검사
  const validateName = (name: string) => {
    const regex = /^[가-힣]+$/;
    return regex.test(name) && name.length >= 2 && name.length <= 5;
  };

  const handleLogin = async () => {
    setError("");

    // 입력값 검증
    if (!employeeId.trim()) {
      setError("사번을 입력해주세요.");
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError("사번은 2로 시작하는 8자리 숫자여야 합니다.");
      return;
    }

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!validateName(name.trim())) {
      setError("이름은 2-5자리 한글만 입력 가능합니다.");
      return;
    }

    setIsLoading(true);

    try {
      // 사용자 정보를 로컬 스토리지에 저장 (자동 회원가입)
      const userData = {
        employeeId: employeeId.trim(),
        name: name.trim(),
        loginDate: new Date().toISOString(),
        isNewUser: !localStorage.getItem(`user_${employeeId.trim()}`)
      };

      localStorage.setItem(`user_${employeeId.trim()}`, JSON.stringify(userData));
      localStorage.setItem('currentUser', JSON.stringify(userData));

      // 로그인 성공
      onLogin(userData);
    } catch (error) {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로
          </Button>

          <div className="flex justify-center">
            <img src={seoulMetroLogo} alt="서울교통공사 로고" className="w-24 h-24" />
          </div>
          <div>
            <h1 className="mb-2">
              사용자 로그인
            </h1>
            <p className="text-muted-foreground">
              서울교통공사 안전교육허브에 로그인하세요
            </p>
          </div>
        </div>

        {/* 로그인 폼 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              로그인 정보 입력
            </CardTitle>
            <CardDescription>
              사번과 이름을 입력하시면 자동으로 회원가입이 완료됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="employeeId">사번</Label>
              <Input
                id="employeeId"
                type="text"
                placeholder="20000000 (2로 시작하는 8자리)"
                value={employeeId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setEmployeeId(value);
                }}
                onKeyPress={handleKeyPress}
                maxLength={8}
                className="text-center tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                2로 시작하는 8자리 숫자를 입력하세요
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => {
                  // 한글만 입력 허용
                  const value = e.target.value.replace(/[^가-힣]/g, "").slice(0, 5);
                  setName(value);
                }}
                onKeyPress={handleKeyPress}
                maxLength={5}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground">
                한글 이름을 입력하세요 (2-5자)
              </p>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading || !employeeId || !name}
              className="w-full"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>• 처음 로그인하시는 경우 자동으로 회원가입됩니다</p>
              <p>• 개인정보는 학습 진행률 저장을 위해서만 사용됩니다</p>
            </div>
          </CardContent>
        </Card>

        {/* 안내 메시지 */}
        <div className="text-center text-sm text-muted-foreground">
          <p>서울교통공사 동대문승무사업소</p>
          <p>안전교육허브</p>
        </div>
      </div>
    </div>
  );
}