#!/usr/bin/env bash
# ============================================================================
#  원스톱 배포 스크립트 (setup.sh)
#  코딩을 모르는 분도 이 스크립트 하나로 모든 설정·배포를 완료할 수 있습니다.
#
#  사용법:
#    chmod +x scripts/setup.sh
#    ./scripts/setup.sh
# ============================================================================
set -euo pipefail

# ── 색상 코드 ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  ${BOLD}📚 기관 학습관리 시스템 (LMS) 원스톱 배포${NC}         ${CYAN}║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

confirm() {
  local prompt="$1"
  local default="${2:-y}"
  local yn
  if [ "$default" = "y" ]; then
    read -r -p "$(echo -e "${CYAN}❓ ${prompt} [Y/n]: ${NC}")" yn
    yn=${yn:-y}
  else
    read -r -p "$(echo -e "${CYAN}❓ ${prompt} [y/N]: ${NC}")" yn
    yn=${yn:-n}
  fi
  case "$yn" in
    [Yy]*) return 0 ;;
    *) return 1 ;;
  esac
}

# ── 경로 설정 ──
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"
CONFIG_FILE="$REPO_ROOT/org.config.json"

print_banner

# ══════════════════════════════════════════════════════════════════════════════
# Step 0: 사전 조건 확인 및 자동 설치
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 1/10: 필요한 프로그램들을 확인합니다"

# Node.js 확인
if ! command -v node &>/dev/null; then
  print_error "Node.js가 설치되어 있지 않습니다."
  print_info "Node.js를 설치합니다..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &>/dev/null; then
      brew install node
    else
      print_info "Homebrew가 없습니다. Homebrew를 먼저 설치합니다..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      brew install node
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    print_error "Node.js를 수동으로 설치해주세요: https://nodejs.org"
    exit 1
  fi
fi
print_success "Node.js $(node --version) 확인됨"

# npm 확인
if ! command -v npm &>/dev/null; then
  print_error "npm이 설치되어 있지 않습니다. Node.js를 재설치해주세요."
  exit 1
fi
print_success "npm $(npm --version) 확인됨"

# jq 확인 (JSON 파싱용) - 없으면 node로 대체
USE_JQ=false
if command -v jq &>/dev/null; then
  USE_JQ=true
  print_success "jq 확인됨"
else
  print_info "jq가 없습니다. Node.js로 JSON을 파싱합니다."
fi

# JSON 값 읽기 함수
read_json() {
  local file="$1"
  local path="$2"
  if [ "$USE_JQ" = true ]; then
    jq -r "$path // empty" "$file" 2>/dev/null || echo ""
  else
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('$file', 'utf8'));
      const path = '$path'.replace(/^\\./, '');
      const keys = path.split('.').filter(Boolean);
      let val = data;
      for (const k of keys) val = val?.[k];
      console.log(val ?? '');
    " 2>/dev/null || echo ""
  fi
}

# JSON 값 쓰기 함수
write_json() {
  local file="$1"
  local path="$2"
  local value="$3"
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$file', 'utf8'));
    const keys = '$path'.split('.').filter(Boolean);
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = '$value';
    fs.writeFileSync('$file', JSON.stringify(data, null, 2) + '\\n');
  "
}

# Supabase CLI 확인
if ! command -v supabase &>/dev/null && ! npx supabase --version &>/dev/null 2>&1; then
  print_info "Supabase CLI를 설치합니다..."
  npm install -g supabase@latest
fi
print_success "Supabase CLI 확인됨"

# Vercel CLI 확인
if ! command -v vercel &>/dev/null && ! npx vercel --version &>/dev/null 2>&1; then
  print_info "Vercel CLI를 설치합니다..."
  npm install -g vercel@latest
fi
print_success "Vercel CLI 확인됨"

# ══════════════════════════════════════════════════════════════════════════════
# Step 1: org.config.json 읽기
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 2/10: 설정 파일을 읽습니다"

if [ ! -f "$CONFIG_FILE" ]; then
  print_error "org.config.json 파일이 없습니다!"
  print_info "org.config.example.json을 복사하여 org.config.json을 만들어주세요:"
  print_info "  cp org.config.example.json org.config.json"
  print_info "  그 후 org.config.json을 열어 기관 정보를 수정하세요."
  exit 1
fi

ORG_NAME=$(read_json "$CONFIG_FILE" ".organization.name")
SHORT_NAME=$(read_json "$CONFIG_FILE" ".organization.shortName")
APP_TITLE=$(read_json "$CONFIG_FILE" ".organization.appTitle")
DESCRIPTION=$(read_json "$CONFIG_FILE" ".organization.description")
SUPABASE_PROJECT_ID=$(read_json "$CONFIG_FILE" ".supabase.projectId")
SUPABASE_ANON_KEY=$(read_json "$CONFIG_FILE" ".supabase.anonKey")
SUPABASE_REGION=$(read_json "$CONFIG_FILE" ".supabase.region")
VERCEL_PROJECT_NAME=$(read_json "$CONFIG_FILE" ".vercel.projectName")
AI_ENABLED=$(read_json "$CONFIG_FILE" ".ai.enabled")
OPENAI_KEY=$(read_json "$CONFIG_FILE" ".ai.openaiApiKey")
YOUTUBE_IMPORT=$(read_json "$CONFIG_FILE" ".youtube.channelImport")
THEME_COLOR=$(read_json "$CONFIG_FILE" ".branding.themeColor")

echo ""
echo -e "  📌 기관명:     ${BOLD}$ORG_NAME${NC}"
echo -e "  📌 앱 이름:    ${BOLD}$SHORT_NAME${NC}"
echo -e "  📌 AI 채팅:    ${BOLD}$([ "$AI_ENABLED" = "true" ] && echo "활성화" || echo "비활성화")${NC}"
echo -e "  📌 YouTube:    ${BOLD}$([ "$YOUTUBE_IMPORT" = "true" ] && echo "활성화" || echo "비활성화")${NC}"
echo ""

if ! confirm "이 설정으로 배포를 진행할까요?"; then
  print_info "org.config.json을 수정한 후 다시 실행해주세요."
  exit 0
fi

# ══════════════════════════════════════════════════════════════════════════════
# Step 2: npm install
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 3/10: 필요한 패키지를 설치합니다"
npm install --no-audit --no-fund 2>&1 | tail -3

# ══════════════════════════════════════════════════════════════════════════════
# Step 3: Supabase 로그인 및 프로젝트 설정
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 4/10: Supabase 데이터베이스를 설정합니다"

# 로그인 확인
if ! npx supabase projects list &>/dev/null 2>&1; then
  echo ""
  print_info "Supabase 계정이 필요합니다."
  print_info "지금 브라우저가 열립니다."
  print_info "Supabase 계정이 없으시면 'Sign Up' 버튼을 눌러 회원가입해주세요."
  print_info "GitHub 계정으로 간편하게 가입할 수 있습니다."
  echo ""
  read -r -p "$(echo -e "${CYAN}준비되셨으면 Enter를 누르세요...${NC}")"
  npx supabase login
fi
print_success "Supabase 로그인 확인됨"

# 프로젝트 생성 또는 연결
if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo ""
  print_info "새로운 Supabase 프로젝트를 생성합니다."
  echo ""

  # 프로젝트 이름
  DEFAULT_PROJECT_NAME="${SHORT_NAME}-lms"
  read -r -p "$(echo -e "${CYAN}프로젝트 이름을 입력하세요 [${DEFAULT_PROJECT_NAME}]: ${NC}")" PROJECT_NAME
  PROJECT_NAME=${PROJECT_NAME:-$DEFAULT_PROJECT_NAME}

  # Organization 선택
  print_info "Supabase 조직 목록을 가져옵니다..."
  ORG_LIST=$(npx supabase orgs list 2>/dev/null | tail -n +4 || true)
  if [ -z "$ORG_LIST" ]; then
    print_error "Supabase 조직을 찾을 수 없습니다."
    print_info "https://supabase.com/dashboard 에서 먼저 조직을 만들어주세요."
    exit 1
  fi
  echo ""
  echo "$ORG_LIST"
  echo ""
  # 첫 번째 조직의 ID 자동 추출
  DEFAULT_ORG_ID=$(echo "$ORG_LIST" | head -1 | awk '{print $1}' || true)
  read -r -p "$(echo -e "${CYAN}사용할 조직 ID를 입력하세요 [${DEFAULT_ORG_ID}]: ${NC}")" ORG_ID
  ORG_ID=${ORG_ID:-$DEFAULT_ORG_ID}

  # 리전 선택
  REGION=${SUPABASE_REGION:-ap-northeast-2}
  print_info "리전: $REGION (한국)"

  # DB 비밀번호 자동 생성
  DB_PASSWORD=$(openssl rand -base64 16 | tr -d '=/+' | head -c 16)

  # 프로젝트 생성
  print_info "프로젝트를 생성합니다... (1~2분 소요)"
  CREATE_OUTPUT=$(npx supabase projects create "$PROJECT_NAME" \
    --org-id "$ORG_ID" \
    --region "$REGION" \
    --db-password "$DB_PASSWORD" 2>&1 || true)
  echo "$CREATE_OUTPUT"

  # 프로젝트 ID 추출
  SUPABASE_PROJECT_ID=$(echo "$CREATE_OUTPUT" | grep -oE '[a-z]{20}' | head -1 || true)

  if [ -z "$SUPABASE_PROJECT_ID" ]; then
    print_warn "프로젝트 ID를 자동으로 추출하지 못했습니다."
    print_info "https://supabase.com/dashboard 에서 프로젝트 설정 → General 에서 Reference ID를 확인하세요."
    read -r -p "$(echo -e "${CYAN}프로젝트 Reference ID를 입력하세요: ${NC}")" SUPABASE_PROJECT_ID
  fi

  # API 키 가져오기
  print_info "Supabase 프로젝트가 준비되고 키가 발급될 때까지 대기합니다..."
  SUPABASE_ANON_KEY=""
  for i in {1..12}; do
    print_info "API 키 조회 중... ($i/12)"
    API_KEYS=$(npx supabase projects api-keys --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null || true)
    SUPABASE_ANON_KEY=$(echo "$API_KEYS" | grep "anon" | awk '{print $NF}' || true)
    if [ -n "$SUPABASE_ANON_KEY" ]; then
      print_success "API 키 확인 성공!"
      break
    fi
    sleep 5
  done

  if [ -z "$SUPABASE_ANON_KEY" ]; then
    print_warn "API anon 키를 자동으로 추출하지 못했습니다."
    print_info "https://supabase.com/dashboard → 프로젝트 설정 → API 에서 anon key를 확인하세요."
    read -r -p "$(echo -e "${CYAN}anon key를 직접 입력하세요: ${NC}")" SUPABASE_ANON_KEY
  fi

  # org.config.json 업데이트
  write_json "$CONFIG_FILE" "supabase.projectId" "$SUPABASE_PROJECT_ID"
  write_json "$CONFIG_FILE" "supabase.anonKey" "$SUPABASE_ANON_KEY"
  print_success "Supabase 프로젝트가 성공적으로 구성되었습니다: $SUPABASE_PROJECT_ID"
else
  print_success "기존 Supabase 프로젝트 사용: $SUPABASE_PROJECT_ID"
fi

# 프로젝트 연결
print_info "프로젝트를 연결합니다..."
npx supabase link --project-ref "$SUPABASE_PROJECT_ID" 2>&1 || true

# ══════════════════════════════════════════════════════════════════════════════
# Step 4: Edge Function slug 생성
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 5/10: 서버 함수를 준비합니다"

# 고유 slug 생성
SLUG_HASH=$(node -e "console.log(require('crypto').createHash('md5').update('${SHORT_NAME}' + Date.now()).digest('hex').slice(0, 8))")
FUNCTION_SLUG="lms-server-${SLUG_HASH}"

OLD_FUNCTION_DIR="$REPO_ROOT/supabase/functions/make-server-a8898ff1"
NEW_FUNCTION_DIR="$REPO_ROOT/supabase/functions/$FUNCTION_SLUG"

if [ -d "$OLD_FUNCTION_DIR" ] && [ ! -d "$NEW_FUNCTION_DIR" ]; then
  cp -r "$OLD_FUNCTION_DIR" "$NEW_FUNCTION_DIR"
  print_success "서버 함수 디렉토리 생성: $FUNCTION_SLUG"
elif [ -d "$NEW_FUNCTION_DIR" ]; then
  print_success "서버 함수 디렉토리 이미 존재: $FUNCTION_SLUG"
else
  print_error "기존 서버 함수 디렉토리를 찾을 수 없습니다."
  exit 1
fi

# supabase/config.toml 업데이트
CONFIG_TOML="$REPO_ROOT/supabase/config.toml"
if [ -f "$CONFIG_TOML" ]; then
  node -e "
    const fs = require('fs');
    let content = fs.readFileSync('$CONFIG_TOML', 'utf8');
    if (content.includes('make-server-a8898ff1')) {
      content = content.split('make-server-a8898ff1').join('$FUNCTION_SLUG');
    } else if (!content.includes('$FUNCTION_SLUG')) {
      content += '\n\n[functions.$FUNCTION_SLUG]\nverify_jwt = false\n';
    }
    fs.writeFileSync('$CONFIG_TOML', content, 'utf8');
  "
fi

print_success "Edge Function slug: $FUNCTION_SLUG"

# ══════════════════════════════════════════════════════════════════════════════
# Step 5: DB 마이그레이션
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 6/10: 데이터베이스 테이블을 생성합니다"
npx supabase db push --project-ref "$SUPABASE_PROJECT_ID" 2>&1 | tail -5 || {
  print_warn "마이그레이션 중 일부 경고가 있을 수 있습니다. 계속 진행합니다."
}

# ══════════════════════════════════════════════════════════════════════════════
# Step 6: Edge Function 배포
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 7/10: 서버 함수를 배포합니다"
npx supabase functions deploy "$FUNCTION_SLUG" \
  --project-ref "$SUPABASE_PROJECT_ID" \
  --no-verify-jwt 2>&1 | tail -5 || {
  print_error "Edge Function 배포에 실패했습니다."
  print_info "수동으로 실행하세요: npx supabase functions deploy $FUNCTION_SLUG --project-ref $SUPABASE_PROJECT_ID --no-verify-jwt"
}

# ══════════════════════════════════════════════════════════════════════════════
# Step 7: 시크릿 설정 (옵션)
# ══════════════════════════════════════════════════════════════════════════════
if [ "$AI_ENABLED" = "true" ]; then
  print_step "Step 7-1: AI 챗봇을 설정합니다"

  if [ -z "$OPENAI_KEY" ]; then
    echo ""
    print_info "AI 챗봇 기능을 사용하려면 OpenAI API 키가 필요합니다."
    print_info "https://platform.openai.com/api-keys 에서 키를 발급받을 수 있습니다."
    echo ""
    read -r -p "$(echo -e "${CYAN}OpenAI API 키를 입력하세요 (나중에 설정하려면 Enter): ${NC}")" OPENAI_KEY
  fi

  if [ -n "$OPENAI_KEY" ]; then
    npx supabase secrets set OPENAI_API_KEY="$OPENAI_KEY" \
      --project-ref "$SUPABASE_PROJECT_ID" 2>&1 || true
    print_success "OpenAI API 키가 설정되었습니다."
  else
    print_warn "OpenAI API 키를 입력하지 않았습니다. AI 채팅 기능이 비활성화됩니다."
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# Step 8: YouTube 채널 영상 임포트 (옵션)
# ══════════════════════════════════════════════════════════════════════════════
if [ "$YOUTUBE_IMPORT" = "true" ]; then
  print_step "Step 8: YouTube 채널 영상을 가져옵니다"

  if [ -f "$REPO_ROOT/scripts/youtube-import.mjs" ]; then
    node "$REPO_ROOT/scripts/youtube-import.mjs" || {
      print_warn "YouTube 임포트 중 오류가 발생했습니다. 나중에 관리자 페이지에서 수동으로 추가할 수 있습니다."
    }
  else
    print_warn "youtube-import.mjs 스크립트를 찾을 수 없습니다. 건너뜁니다."
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# Step 9: 브랜딩 파일 생성 + info.tsx 생성
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 8/10: 브랜딩을 적용합니다"

# src/utils/supabase/info.tsx 생성
INFO_FILE="$REPO_ROOT/src/utils/supabase/info.tsx"
cat > "$INFO_FILE" << EOF
/* AUTOGENERATED FILE - DO NOT EDIT CONTENTS */

export const projectId: string = "${SUPABASE_PROJECT_ID}"
export const publicAnonKey: string = "${SUPABASE_ANON_KEY}"
export const functionSlug: string = "${FUNCTION_SLUG}"
EOF
print_success "Supabase 연결 정보가 생성되었습니다."

# generate-branding.mjs 실행
if [ -f "$REPO_ROOT/scripts/generate-branding.mjs" ]; then
  node "$REPO_ROOT/scripts/generate-branding.mjs"
  print_success "브랜딩 파일이 업데이트되었습니다."
else
  print_warn "generate-branding.mjs를 찾을 수 없습니다. 수동으로 브랜딩을 적용합니다."
  # 최소한의 수동 브랜딩 처리
  # index.html title 교체
  if [ -f "$REPO_ROOT/index.html" ]; then
    sed -i.bak "s|<title>.*</title>|<title>${APP_TITLE}</title>|g" "$REPO_ROOT/index.html"
    rm -f "$REPO_ROOT/index.html.bak"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# Step 10: 프론트엔드 빌드
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 9/10: 앱을 빌드합니다"
npm run build 2>&1 | tail -5

# ══════════════════════════════════════════════════════════════════════════════
# Step 11: Vercel 배포
# ══════════════════════════════════════════════════════════════════════════════
print_step "Step 10/10: 앱을 인터넷에 배포합니다"

# Vercel 로그인 확인
if ! npx vercel whoami &>/dev/null 2>&1; then
  echo ""
  print_info "Vercel 계정이 필요합니다."
  print_info "지금 브라우저가 열립니다."
  print_info "Vercel 계정이 없으시면 'Sign Up' 버튼을 눌러 회원가입해주세요."
  print_info "GitHub 계정으로 간편하게 가입할 수 있습니다."
  echo ""
  read -r -p "$(echo -e "${CYAN}준비되셨으면 Enter를 누르세요...${NC}")"
  npx vercel login
fi
print_success "Vercel 로그인 확인됨"

# Vercel 프로젝트 연결 및 배포
  print_info "Vercel 프로젝트 링크 설정을 진행합니다..."
  
  # vercel.projectName 설정값 로드
  VERCEL_PROJECT_OPT=""
  if [ -n "$VERCEL_PROJECT_NAME" ]; then
    VERCEL_PROJECT_OPT="--project $VERCEL_PROJECT_NAME"
    print_info "프로젝트명 지정: $VERCEL_PROJECT_NAME"
  fi

  npx vercel link --yes $VERCEL_PROJECT_OPT 2>&1 | tail -3 || true
  
  print_info "앱을 배포합니다... (1~2분 소요)"
  DEPLOY_OUTPUT=$(npx vercel --prod --yes 2>&1 || true)
  echo "$DEPLOY_OUTPUT" | tail -5

# URL 추출
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.vercel\.app' | head -1 || true)
if [ -z "$DEPLOY_URL" ]; then
  DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[^ ]+' | head -1 || true)
fi

# ══════════════════════════════════════════════════════════════════════════════
# 완료!
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}${BOLD}🎉 배포가 완료되었습니다!${NC}                        ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📱 ${BOLD}앱 주소:${NC}     ${DEPLOY_URL:-'Vercel 대시보드에서 확인하세요'}"
echo -e "  🔑 ${BOLD}관리자 로그인:${NC} 사번 ADMIN001 / 비밀번호 admin123!"
echo ""
echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${BOLD}다음 단계:${NC}"
echo -e "  1. 위 URL을 직원들에게 공유하세요."
echo -e "  2. 휴대폰에서 URL 접속 → '홈 화면에 추가'로 앱처럼 사용 가능합니다."
echo -e "  3. 관리자 로그인 후 비밀번호를 꼭 변경하세요!"
echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
