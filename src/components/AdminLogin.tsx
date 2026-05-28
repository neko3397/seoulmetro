import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import logo from '../assets/logo.png'; // 로고 이미지 경로

interface AdminLoginProps {
  onLogin: (admin: any) => void;
  onBack?: () => void;
}

export function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setServerStatus('checking');

    try {
      const normalizedEmployeeId = employeeId.trim();
      const dummyEmail = `${normalizedEmployeeId}@admin.local`;
      const loginUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/login`;
      
      console.log('Attempting admin login to Edge Function:', loginUrl);

      // 1. 에지 함수 로그인 (기존 비즈니스 로직 및 비밀번호 검증 유지)
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ employeeId: normalizedEmployeeId, password })
      });

      console.log('Edge Function response status:', response.status);
      setServerStatus('online');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);

        if (response.status === 401) {
          setError('사번 또는 비밀번호가 올바르지 않습니다.');
        } else if (response.status === 404) {
          setServerStatus('offline');
          setError('서버를 찾을 수 없습니다. Supabase Edge Function이 배포되지 않았습니다.');
        } else {
          setError(`서버 오류가 발생했습니다 (상태 코드: ${response.status})`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Edge Function login response:', data);

      if (!data.success) {
        setError(data.error || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 2. Supabase Auth 세션 생성 (RLS 및 Realtime을 위해 필요)
      // 에지 함수 로그인이 성공한 경우에만 Auth 로그인을 시도합니다.
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: password,
      });

      if (authError) {
        // 관리자가 auth.users에 없는 경우 자동으로 생성 시도 (최초 1회)
        if (authError.message.includes("Invalid login credentials")) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: dummyEmail,
            password: password,
            options: {
              data: {
                employee_id: normalizedEmployeeId,
                name: data.admin.name,
                is_admin: true
              }
            }
          });
          
          if (signUpError) {
            console.warn("Admin Auth Auto-SignUp failed:", signUpError.message);
          } else {
            console.log("Admin Auth account created automatically");
            // 가입 후 다시 로그인 시도 불필요 (signUp이 세션을 반환함)
          }
        } else {
          console.error("Admin Supabase Auth error:", authError.message);
        }
      }

      // 3. authUserId 매핑 업데이트를 위해 에지 함수 재호출 (옵션)
      // 에지 함수에서 이미 관리자 정보를 가져왔으므로, authUserId가 비어있다면 업데이트 요청을 보냅니다.
      if (supabase.auth.session?.()?.user?.id) {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/${data.admin.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ authUserId: supabase.auth.session()?.user?.id })
        }).catch(err => console.warn("Failed to sync admin auth_user_id:", err));
      }

      onLogin(data.admin);
    } catch (error) {
      console.error('Login error:', error);
      setServerStatus('offline');

      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('네트워크 오류: 서버에 연결할 수 없습니다. Supabase Edge Function이 배포되어 있는지 확인해주세요.');
      } else {
        setError('로그인 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 w-fit mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로
            </Button>
          )}
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              alt="서울교통공사"
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-center">관리자 로그인</CardTitle>
          <CardDescription className="text-center">
            서울교통공사 불안제로 관리자 페이지
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">사번</Label>
              <Input
                id="employeeId"
                type="text"
                placeholder="사번을 입력하세요"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {serverStatus && (
              <div className={`flex items-center space-x-2 text-sm p-3 rounded-lg ${serverStatus === 'checking' ? 'bg-gray-100 text-gray-700' :
                serverStatus === 'online' ? 'bg-green-50 text-green-700' :
                  'bg-red-50 text-red-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${serverStatus === 'checking' ? 'bg-gray-500 animate-pulse' :
                  serverStatus === 'online' ? 'bg-green-500' :
                    'bg-red-500'
                  }`} />
                <span>
                  {serverStatus === 'checking' && '서버 연결 확인 중...'}
                  {serverStatus === 'online' && '서버 연결됨'}
                  {serverStatus === 'offline' && '서버 연결 실패'}
                </span>
              </div>
            )}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
