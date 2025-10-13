# 서버 배포 가이드

## Supabase Edge Function 배포

이 애플리케이션의 관리자 로그인 및 대시보드 기능은 Supabase Edge Function을 통해 작동합니다.

### 1. Supabase CLI 설치

```bash
npm install -g supabase
```

### 2. Supabase 프로젝트 로그인

```bash
supabase login
```

### 3. 프로젝트와 연결

```bash
supabase link --project-ref nkowcjmjqaszwtrvgedt
```

### 4. Edge Function 배포

```bash
supabase functions deploy make-server-a8898ff1
```

또는 특정 함수만 배포:

```bash
cd supabase/functions
supabase functions deploy server
```

### 5. 배포 확인

배포 후 다음 URL로 헬스 체크:
```
https://nkowcjmjqaszwtrvgedt.supabase.co/functions/v1/make-server-a8898ff1/health
```

정상 응답:
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-11T..."
}
```

### 6. 환경 변수 확인

Edge Function은 다음 환경 변수를 자동으로 사용합니다:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`

이 변수들은 Supabase에 의해 자동으로 주입됩니다.

## 트러블슈팅

### 서버 연결 실패
1. Edge Function이 실제로 배포되었는지 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. 브라우저 콘솔에서 CORS 에러가 있는지 확인

### 배포 로그 확인
```bash
supabase functions logs make-server-a8898ff1
```

### 로컬 테스트
```bash
supabase functions serve server
```

## 기본 관리자 계정

배포 후 서버가 자동으로 생성하는 기본 관리자:
- 사번: `ADMIN001`
- 비밀번호: `admin123!`

## API 엔드포인트

- `POST /make-server-a8898ff1/admin/login` - 관리자 로그인
- `GET /make-server-a8898ff1/admin/list` - 관리자 목록
- `POST /make-server-a8898ff1/admin/create` - 관리자 생성
- `GET /make-server-a8898ff1/categories` - 카테고리 조회
- `POST /make-server-a8898ff1/videos` - 영상 생성
- `GET /make-server-a8898ff1/health` - 헬스 체크
