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
      const loginUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/login`;
      console.log('Attempting login to:', loginUrl);

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ employeeId, password })
      });

      console.log('Response status:', response.status);
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
      console.log('Login response:', data);

      if (data.success) {
        onLogin(data.admin);
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
            서울교통공사 안전교육허브 관리자 페이지
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
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">📌 기본 관리자 계정</p>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 사번: <code className="bg-blue-100 px-2 py-0.5 rounded">ADMIN001</code></p>
              <p>• 비밀번호: <code className="bg-blue-100 px-2 py-0.5 rounded">admin123!</code></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}