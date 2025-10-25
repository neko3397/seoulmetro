import { useState, type KeyboardEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { User, ArrowLeft } from "lucide-react";
import seoulMetroLogo from "../assets/logo.png"; // 타입 선언 추가 필요
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface LoggedInUser {
  employeeId: string;
  name: string;
  id: string;
  loginDate: string;
  isNewUser: boolean;
}

interface UserLoginProps {
  onLogin: (user: LoggedInUser) => void;
  onBack: () => void;
}

const validateEmployeeAuthorization = async (employeeId: string, name: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/users/validate`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({ employeeId, name })
      }
    );

    if (!response.ok) {
      console.error("Authorization validation failed with status:", response.status);
      return false;
    }

    const data = await response.json();
    return Boolean(data?.success);
  } catch (error) {
    console.error("Authorization validation error:", error);
    return false;
  }
};

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
  const validateName = (value: string) => {
    const regex = /^[가-힣]+$/;
    return regex.test(value) && value.length >= 2 && value.length <= 5;
  };

  const handleLogin = async () => {
    setError("");

    if (!employeeId.trim()) {
      setError("사번을 입력해주세요.");
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError("올바른 사번 형식이 아닙니다.");
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
      const normalizedEmployeeId = employeeId.trim();
      const normalizedName = name.trim();

      const isAuthorized = await validateEmployeeAuthorization(normalizedEmployeeId, normalizedName);
      if (!isAuthorized) {
        setError("등록된 사번/이름이 아닙니다. 관리자에게 문의해주세요.");
        return;
      }

      const userStorageKey = `user_${normalizedEmployeeId}`;
      const existingLocalUser = localStorage.getItem(userStorageKey);
      const id = `${normalizedEmployeeId}`;

      const userData: LoggedInUser = {
        employeeId: normalizedEmployeeId,
        name: normalizedName,
        id: id,
        loginDate: new Date().toISOString(),
        isNewUser: !existingLocalUser
      };

      const v = Date.now();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/users?v=${v}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify({
            id: id,
            name: normalizedName,
            employeeId: normalizedEmployeeId
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to sync user info:", response.status, errorText);
        throw new Error("사용자 정보를 저장하지 못했습니다.");
      }

      localStorage.setItem(userStorageKey, JSON.stringify(userData));
      localStorage.setItem("currentUser", JSON.stringify(userData));
      localStorage.setItem("learningHubId", id);

      // 자동 출석 체크: 서버에 attendance=true 전송
      try {
        const v2 = Date.now();
        const attendRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/users/${normalizedEmployeeId}/attendance?v=${v2}`,
          {
            method: 'POST',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ attendance: true })
          }
        );

        if (attendRes.ok) {
          const attendData = await attendRes.json();
          if (attendData?.user) {
            // 서버 정본으로 로컬 갱신
            localStorage.setItem("currentUser", JSON.stringify(attendData.user));
          }
        } else {
          console.warn('Attendance sync failed with status', attendRes.status);
          // Fallback: try to create an attendance log entry which doesn't require a user record
          try {
            const logRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/users/${normalizedEmployeeId}/attendance/log?v=${Date.now()}`,
              {
                method: 'POST',
                cache: 'no-store',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ timestamp: new Date().toISOString() })
              }
            );

            if (logRes.ok) {
              console.log('Attendance log created as fallback');
            } else {
              console.warn('Attendance log fallback failed with status', logRes.status);
            }
          } catch (e) {
            console.error('Attendance log fallback error:', e);
          }
        }
      } catch (e) {
        console.error('Attendance sync error:', e);
        // On network/error, attempt to write an attendance log as a best-effort fallback
        try {
          const logRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/users/${normalizedEmployeeId}/attendance/log?v=${Date.now()}`,
            {
              method: 'POST',
              cache: 'no-store',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
                'Cache-Control': 'no-cache'
              },
              body: JSON.stringify({ timestamp: new Date().toISOString() })
            }
          );

          if (logRes.ok) {
            console.log('Attendance log created as fallback after error');
          } else {
            console.warn('Attendance log fallback failed with status', logRes.status);
          }
        } catch (err) {
          console.error('Attendance log fallback error after sync exception:', err);
        }
      }

      onLogin(userData);
    } catch (error) {
      console.error("User login failed:", error);
      setError("사용자 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md space-y-6 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="absolute left-4 top-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Button>
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={seoulMetroLogo} alt="서울교통공사 로고" className="w-24 h-24" />
          </div>
          <div>
            <h1 className="mb-2">사용자 로그인</h1>
            <p className="text-muted-foreground">
              동대문승무사업소 불안제로에 로그인하세요
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
            <CardDescription>사번과 이름을 입력하세요</CardDescription>
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
                value={employeeId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setEmployeeId(value);
                }}
                onKeyPress={handleKeyPress}
                maxLength={8}
                className="text-center tracking-wider"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={5}
                className="text-center"
              />
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
          <p>불안제로</p>
        </div>
      </div>
    </div>
  );
}