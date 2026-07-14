#!/usr/bin/env node

/**
 * 브랜딩 파일 생성 스크립트
 *
 * org.config.json의 설정값을 읽어 프로젝트의 브랜딩 관련 파일들을 자동으로 수정합니다.
 *
 * 수정되는 파일:
 *   - index.html (title, theme-color, apple-mobile-web-app-title)
 *   - manifest.json (name, short_name, description, theme_color, background_color)
 *   - public/manifest.json (위와 동일)
 *   - vite.config.ts (PWA manifest 섹션)
 *   - package.json (name 필드)
 *
 * 사용법:
 *   node scripts/generate-branding.mjs              # 브랜딩 파일 생성/수정
 *   node scripts/generate-branding.mjs --validate   # 설정 파일 유효성만 검사
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(REPO_ROOT, 'org.config.json');

const GREEN = '\x1b[0;32m';
const RED = '\x1b[0;31m';
const YELLOW = '\x1b[1;33m';
const NC = '\x1b[0m';

const printSuccess = (msg) => console.log(`${GREEN}✅ ${msg}${NC}`);
const printError = (msg) => console.error(`${RED}❌ ${msg}${NC}`);
const printWarn = (msg) => console.log(`${YELLOW}⚠️  ${msg}${NC}`);

// ── 설정 읽기 ──
function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    printError('org.config.json 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (e) {
    printError(`org.config.json 파싱 실패: ${e.message}`);
    process.exit(1);
  }
}

// ── 설정 검증 ──
function validateConfig(config) {
  const errors = [];
  const warnings = [];

  const requiredOrg = ['name', 'shortName', 'appTitle', 'description'];
  for (const f of requiredOrg) {
    if (!config.organization?.[f]) errors.push(`organization.${f} 값이 비어있습니다.`);
  }

  if (!config.branding?.themeColor) warnings.push('branding.themeColor가 비어있습니다. 기본값(#1f2937)이 사용됩니다.');
  if (!config.supabase?.projectId) warnings.push('supabase.projectId가 비어있습니다. setup.sh에서 자동 설정됩니다.');

  return { errors, warnings };
}

// ── 파일 수정 유틸 ──
function safeRead(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

function safeWrite(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ── 파일별 업데이트 함수 ──
function updateIndexHtml(org, branding) {
  const fp = path.join(REPO_ROOT, 'index.html');
  let c = safeRead(fp);
  if (!c) { printWarn('index.html 없음. 건너뜁니다.'); return false; }

  c = c.replace(/<title>[^<]*<\/title>/, `<title>${org.appTitle}</title>`);
  c = c.replace(/<meta\s+name="theme-color"\s+content="[^"]*"\s*\/?>/, `<meta name="theme-color" content="${branding.themeColor}">`);
  c = c.replace(/<meta\s+name="apple-mobile-web-app-title"\s+content="[^"]*"\s*\/?>/, `<meta name="apple-mobile-web-app-title" content="${org.shortName}">`);

  safeWrite(fp, c);
  printSuccess('index.html 수정 완료');
  return true;
}

function updateManifest(filePath, org, branding, label) {
  let c = safeRead(filePath);
  if (!c) { printWarn(`${label} 없음. 건너뜁니다.`); return false; }

  const m = JSON.parse(c);
  m.name = `${org.name} ${org.shortName}`;
  m.short_name = org.shortName;
  m.description = org.description;
  m.theme_color = branding.themeColor;
  m.background_color = branding.backgroundColor;

  safeWrite(filePath, JSON.stringify(m, null, 4) + '\n');
  printSuccess(`${label} 수정 완료`);
  return true;
}

function updateViteConfig(org, branding) {
  const fp = path.join(REPO_ROOT, 'vite.config.ts');
  let c = safeRead(fp);
  if (!c) { printWarn('vite.config.ts 없음. 건너뜁니다.'); return false; }

  c = c.replace(/name: '서울교통공사 동대문승무사업소 불안제로'/, `name: '${org.name} ${org.shortName}'`);
  c = c.replace(/short_name: '불안제로'/, `short_name: '${org.shortName}'`);
  c = c.replace(/description: '서울교통공사 동대문승무사업소 학습 관리 시스템'/, `description: '${org.description}'`);
  c = c.replace(/theme_color: '#1f2937'/, `theme_color: '${branding.themeColor}'`);
  c = c.replace(/background_color: '#ffffff'/, `background_color: '${branding.backgroundColor}'`);

  safeWrite(fp, c);
  printSuccess('vite.config.ts 수정 완료');
  return true;
}

function updatePackageJson(org) {
  const fp = path.join(REPO_ROOT, 'package.json');
  let c = safeRead(fp);
  if (!c) { printWarn('package.json 없음. 건너뜁니다.'); return false; }

  const pkg = JSON.parse(c);
  pkg.name = `${org.name} ${org.shortName}`;
  safeWrite(fp, JSON.stringify(pkg, null, 2) + '\n');
  printSuccess('package.json 수정 완료');
  return true;
}

// ── 메인 ──
const isValidateOnly = process.argv.includes('--validate');
const config = readConfig();
const { errors, warnings } = validateConfig(config);

for (const w of warnings) printWarn(w);

if (errors.length > 0) {
  for (const e of errors) printError(e);
  printError(`설정 파일에 ${errors.length}개의 오류가 있습니다.`);
  process.exit(1);
}

if (isValidateOnly) {
  printSuccess('org.config.json 검증 통과!');
  console.log(`   기관명:    ${config.organization.name}`);
  console.log(`   앱 이름:   ${config.organization.shortName}`);
  console.log(`   앱 제목:   ${config.organization.appTitle}`);
  console.log(`   테마 색상: ${config.branding?.themeColor || '#1f2937'}`);
  process.exit(0);
}

const org = config.organization;
const branding = config.branding || { themeColor: '#1f2937', backgroundColor: '#ffffff' };

console.log('🎨 브랜딩 파일을 업데이트합니다...\n');

let modified = 0;
if (updateIndexHtml(org, branding)) modified++;
if (updateManifest(path.join(REPO_ROOT, 'manifest.json'), org, branding, 'manifest.json (루트)')) modified++;
if (updateManifest(path.join(REPO_ROOT, 'public', 'manifest.json'), org, branding, 'public/manifest.json')) modified++;
if (updateViteConfig(org, branding)) modified++;
if (updatePackageJson(org)) modified++;

console.log(`\n🎉 브랜딩 업데이트 완료! (${modified}개 파일 수정)`);
