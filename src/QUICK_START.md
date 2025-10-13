# 빠른 시작 가이드

## 🚀 서버 배포하기

이 애플리케이션은 **Supabase Edge Function**을 통해 관리자 로그인 및 데이터 관리를 수행합니다.

### 현재 상태
- ✅ Supabase 프로젝트 연결됨 (nkowcjmjqaszwtrvgedt)
- ✅ 서버 코드 작성 완료 (`/supabase/functions/server/index.tsx`)
- ⏳ **Edge Function 배포 필요**

### 배포 단계

#### 1. Supabase CLI 설치
```bash
npm install -g supabase
```

#### 2. Supabase 로그인
```bash
supabase login
```

#### 3. 프로젝트 연결
```bash
supabase link --project-ref nkowcjmjqaszwtrvgedt
```

#### 4. Edge Function 배포
```bash
# 서버 함수 배포
supabase functions deploy server
```

#### 5. 배포 확인
브라우저에서 다음 URL 접속:
```
https://nkowcjmjqaszwtrvgedt.supabase.co/functions/v1/make-server-a8898ff1/health
```

**정상 응답:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-11T..."
}
```

---

## 🔑 관리자 로그인

배포 완료 후, 다음 계정으로 관리자 로그인 가능:

```
사번: ADMIN001
비밀번호: admin123!
```

---

## 📊 주요 기능

### 사용자 기능
- 2로 시작하는 8자리 사번 + 한글 이름으로 로그인
- 자동 회원가입
- 영상 시청 및 진행률 자동 추적 (로컬 스토리지)

### 관리자 기능 (서버 필요)
- ✅ 관리자 로그인 및 계정 관리
- ✅ 카테고리 생성/수정/삭제
- ✅ 영상 업로드 (유튜브 URL 또는 로컬 파일)
- ✅ 사용자 시청 기록 조회

---

## ⚠️ 문제 해결

### "서버에 연결할 수 없습니다" 오류
1. Edge Function이 배포되었는지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. 헬스 체크 URL로 서버 상태 확인

### 배포 로그 확인
```bash
supabase functions logs server
```

### 로컬 테스트
```bash
supabase functions serve server
```

---

## 📁 주요 파일

- `/supabase/functions/server/index.tsx` - Edge Function 서버 코드
- `/components/AdminLogin.tsx` - 관리자 로그인 UI
- `/components/AdminDashboard.tsx` - 관리자 대시보드
- `/utils/supabase/info.tsx` - Supabase 연결 정보

---

## 🎯 다음 단계

1. ✅ Edge Function 배포
2. 관리자 로그인 테스트
3. 카테고리 및 영상 등록
4. 사용자 테스트

---

자세한 내용은 `SERVER_DEPLOYMENT.md`를 참조하세요.
