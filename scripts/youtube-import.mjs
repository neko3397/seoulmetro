#!/usr/bin/env node

/**
 * YouTube 영상 가져오기 스크립트
 * 
 * org.config.json에서 Google OAuth 인증정보를 읽고,
 * YouTube Data API v3를 사용하여 채널의 모든 영상 정보를 가져옵니다.
 * 
 * 사용법:
 *   node scripts/youtube-import.mjs              # 영상 가져오기 실행
 *   node scripts/youtube-import.mjs --dry-run    # 미리보기 (실제 저장 안 함)
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { URL, URLSearchParams } from 'node:url';
import { fileURLToPath } from 'node:url';
import { getAccessToken } from './google-oauth-helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const CONFIG_FILE = path.join(REPO_ROOT, 'org.config.json');

// ===== Colors =====
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const BLUE = '\x1b[0;34m';
const CYAN = '\x1b[0;36m';
const NC = '\x1b[0m';

function printStep(msg) {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
  console.log(`${GREEN}✅ ${msg}${NC}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n`);
}

function printInfo(msg) {
  console.log(`${YELLOW}ℹ️  ${msg}${NC}`);
}

function printError(msg) {
  console.error(`${RED}❌ ${msg}${NC}`);
}

function printSuccess(msg) {
  console.log(`${GREEN}✅ ${msg}${NC}`);
}

// ===== 유틸리티 함수 =====

/**
 * HTTPS GET JSON 요청을 수행합니다.
 * @param {string} url - 요청 URL
 * @param {Record<string, string>} headers - 요청 헤더
 * @returns {Promise<any>}
 */
function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const errorMsg = parsed.error?.message || JSON.stringify(parsed);
            reject(new Error(`YouTube API 오류 (HTTP ${res.statusCode}): ${errorMsg}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`YouTube API 응답을 파싱할 수 없습니다: ${data.slice(0, 200)}`));
        }
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * HTTPS POST JSON 요청을 수행합니다.
 * @param {string} url - 요청 URL
 * @param {any} body - JSON 요청 본문
 * @param {Record<string, string>} headers - 요청 헤더
 * @returns {Promise<any>}
 */
function httpsPostJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const jsonBody = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody),
        'Accept': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const errorMsg = parsed.error?.message || parsed.message || JSON.stringify(parsed);
            reject(new Error(`API 오류 (HTTP ${res.statusCode}): ${errorMsg}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          // 빈 응답도 허용
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true });
          } else {
            reject(new Error(`API 응답을 파싱할 수 없습니다 (HTTP ${res.statusCode}): ${data.slice(0, 200)}`));
          }
        }
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(jsonBody);
    req.end();
  });
}

/**
 * ISO 8601 기간(PT1H2M3S)을 초로 변환합니다.
 * @param {string} duration - ISO 8601 형식의 기간
 * @returns {number} 초
 */
function parseDuration(duration) {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 초를 사람이 읽기 쉬운 형태로 변환합니다.
 * @param {number} totalSeconds - 총 초
 * @returns {string}
 */
function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0) parts.push(`${minutes}분`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}초`);

  return parts.join(' ');
}

// ===== YouTube API 함수 =====

/**
 * 내 채널의 업로드 재생목록 ID를 가져옵니다.
 * @param {string} accessToken - 액세스 토큰
 * @returns {Promise<{channelTitle: string, uploadsPlaylistId: string}>}
 */
async function getUploadsPlaylistId(accessToken) {
  printInfo('채널 정보를 조회합니다...');

  const url = 'https://www.googleapis.com/youtube/v3/channels?mine=true&part=contentDetails,snippet';
  const response = await httpsGetJson(url, {
    Authorization: `Bearer ${accessToken}`,
  });

  if (!response.items || response.items.length === 0) {
    throw new Error(
      '연결된 YouTube 채널을 찾을 수 없습니다.\n' +
      '로그인한 Google 계정에 YouTube 채널이 있는지 확인해 주세요.'
    );
  }

  const channel = response.items[0];
  const channelTitle = channel.snippet?.title || '알 수 없는 채널';
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error('업로드 재생목록 ID를 찾을 수 없습니다.');
  }

  printSuccess(`채널: ${channelTitle}`);
  return { channelTitle, uploadsPlaylistId };
}

/**
 * 재생목록의 모든 영상 ID를 가져옵니다 (페이지네이션 처리).
 * @param {string} playlistId - 재생목록 ID
 * @param {string} accessToken - 액세스 토큰
 * @returns {Promise<string[]>} 영상 ID 배열
 */
async function getAllVideoIds(playlistId, accessToken) {
  printInfo('영상 목록을 가져옵니다...');

  const videoIds = [];
  let pageToken = '';
  let pageNum = 1;

  do {
    const params = new URLSearchParams({
      playlistId,
      part: 'snippet',
      maxResults: '50',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`;
    const response = await httpsGetJson(url, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (response.items) {
      for (const item of response.items) {
        const videoId = item.snippet?.resourceId?.videoId;
        if (videoId) {
          videoIds.push(videoId);
        }
      }
    }

    console.log(`   페이지 ${pageNum}: ${response.items?.length || 0}개 영상 발견 (총 ${videoIds.length}개)`);
    pageToken = response.nextPageToken || '';
    pageNum++;
  } while (pageToken);

  printSuccess(`총 ${videoIds.length}개의 영상을 발견했습니다.`);
  return videoIds;
}

/**
 * 영상의 상세 정보를 가져옵니다 (50개씩 배치 처리).
 * @param {string[]} videoIds - 영상 ID 배열
 * @param {string} accessToken - 액세스 토큰
 * @returns {Promise<Array>} 영상 정보 배열
 */
async function getVideoDetails(videoIds, accessToken) {
  printInfo('영상 상세 정보를 가져옵니다...');

  const videos = [];
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const params = new URLSearchParams({
      id: batch.join(','),
      part: 'snippet,contentDetails',
    });

    const url = `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`;
    const response = await httpsGetJson(url, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (response.items) {
      for (const item of response.items) {
        const durationSeconds = parseDuration(item.contentDetails?.duration);
        const thumbnails = item.snippet?.thumbnails || {};
        const bestThumbnail =
          thumbnails.maxres?.url ||
          thumbnails.standard?.url ||
          thumbnails.high?.url ||
          thumbnails.medium?.url ||
          thumbnails.default?.url ||
          '';

        videos.push({
          youtubeId: item.id,
          title: item.snippet?.title || '제목 없음',
          description: item.snippet?.description || '',
          durationSeconds,
          durationFormatted: formatDuration(durationSeconds),
          thumbnailUrl: bestThumbnail,
          publishedAt: item.snippet?.publishedAt || '',
          channelTitle: item.snippet?.channelTitle || '',
        });
      }
    }

    const progress = Math.min(i + batchSize, videoIds.length);
    console.log(`   상세 정보 조회 중... ${progress}/${videoIds.length}`);
  }

  return videos;
}

// ===== Edge Function API 업로드 =====

/**
 * 영상 데이터를 Edge Function API를 통해 업로드합니다.
 * @param {Array} videos - 영상 정보 배열
 * @param {object} config - org.config.json 설정
 * @returns {Promise<{success: number, failed: number}>}
 */
async function uploadVideos(videos, config) {
  const projectId = config.supabase?.projectId;
  const anonKey = config.supabase?.anonKey;

  // info.tsx에서 읽기 시도
  let finalProjectId = projectId;
  let finalAnonKey = anonKey;

  if (!finalProjectId || !finalAnonKey) {
    const infoPath = path.join(REPO_ROOT, 'src', 'utils', 'supabase', 'info.tsx');
    if (fs.existsSync(infoPath)) {
      const infoContent = fs.readFileSync(infoPath, 'utf-8');
      const pidMatch = infoContent.match(/export const projectId.*=\s*"([^"]+)"/);
      const akMatch = infoContent.match(/export const publicAnonKey.*=\s*"([^"]+)"/);
      if (pidMatch) finalProjectId = finalProjectId || pidMatch[1];
      if (akMatch) finalAnonKey = finalAnonKey || akMatch[1];
    }
  }

  if (!finalProjectId || !finalAnonKey) {
    throw new Error(
      'Supabase 프로젝트 정보가 없습니다.\n' +
      '먼저 setup.sh를 실행하여 Supabase를 설정해 주세요.'
    );
  }

  // functionSlug 결정
  let functionSlug = 'make-server-a8898ff1';
  const infoPath = path.join(REPO_ROOT, 'src', 'utils', 'supabase', 'info.tsx');
  if (fs.existsSync(infoPath)) {
    const infoContent = fs.readFileSync(infoPath, 'utf-8');
    const slugMatch = infoContent.match(/export const functionSlug.*=\s*"([^"]+)"/);
    if (slugMatch) functionSlug = slugMatch[1];
  }

  const apiBase = `https://${finalProjectId}.supabase.co/functions/v1/${functionSlug}`;

  printInfo(`API 엔드포인트: ${apiBase}`);

  let success = 0;
  let failed = 0;

  for (const video of videos) {
    try {
      const payload = {
        youtube_id: video.youtubeId,
        title: video.title,
        description: video.description,
        duration_seconds: video.durationSeconds,
        thumbnail_url: video.thumbnailUrl,
        published_at: video.publishedAt,
      };

      await httpsPostJson(
        `${apiBase}/upload-video`,
        payload,
        { Authorization: `Bearer ${finalAnonKey}` }
      );

      success++;
      console.log(`   ✅ ${video.title} (${video.durationFormatted})`);
    } catch (err) {
      failed++;
      console.log(`   ❌ ${video.title}: ${err.message}`);
    }
  }

  return { success, failed };
}

// ===== 메인 실행 =====

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`${GREEN}📺 YouTube 영상 가져오기${isDryRun ? ' (미리보기 모드)' : ''}${NC}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 설정 파일 읽기
  if (!fs.existsSync(CONFIG_FILE)) {
    printError('org.config.json 파일을 찾을 수 없습니다.');
    printInfo('프로젝트 루트에 org.config.json 파일을 생성해 주세요.');
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (e) {
    printError(`org.config.json 파일을 파싱할 수 없습니다: ${e.message}`);
    process.exit(1);
  }

  const youtubeConfig = config.youtube || {};
  const clientId = youtubeConfig.clientId;
  const clientSecret = youtubeConfig.clientSecret;

  if (!clientId || !clientSecret) {
    printError('YouTube OAuth 설정이 누락되었습니다.');
    console.log(`
${YELLOW}org.config.json에 아래 항목을 추가해 주세요:${NC}

{
  "youtube": {
    "enabled": true,
    "autoImport": true,
    "clientId": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET"
  }
}

${CYAN}Google Cloud Console에서 OAuth 클라이언트 ID 만들기:${NC}
  1. https://console.cloud.google.com 에 접속합니다
  2. API 및 서비스 > 사용자 인증 정보 > OAuth 2.0 클라이언트 ID 만들기
  3. 애플리케이션 유형: "데스크톱 앱" 선택
  4. 생성된 클라이언트 ID와 시크릿을 org.config.json에 입력합니다
  5. YouTube Data API v3을 사용 설정해야 합니다
`);
    process.exit(1);
  }

  // 2. Google OAuth 인증
  printStep('Google 계정 인증');
  let accessToken;
  try {
    accessToken = await getAccessToken(
      clientId,
      clientSecret,
      ['https://www.googleapis.com/auth/youtube.readonly']
    );
  } catch (err) {
    printError(`인증 실패: ${err.message}`);
    process.exit(1);
  }

  // 3. 채널 정보 조회
  printStep('채널 정보 조회');
  let channelTitle, uploadsPlaylistId;
  try {
    const result = await getUploadsPlaylistId(accessToken);
    channelTitle = result.channelTitle;
    uploadsPlaylistId = result.uploadsPlaylistId;
  } catch (err) {
    printError(`채널 정보 조회 실패: ${err.message}`);
    process.exit(1);
  }

  // 4. 영상 ID 수집
  printStep('영상 목록 수집');
  let videoIds;
  try {
    videoIds = await getAllVideoIds(uploadsPlaylistId, accessToken);
  } catch (err) {
    printError(`영상 목록 수집 실패: ${err.message}`);
    process.exit(1);
  }

  if (videoIds.length === 0) {
    printInfo('가져올 영상이 없습니다.');
    process.exit(0);
  }

  // 5. 영상 상세 정보 조회
  printStep('영상 상세 정보 조회');
  let videos;
  try {
    videos = await getVideoDetails(videoIds, accessToken);
  } catch (err) {
    printError(`영상 상세 정보 조회 실패: ${err.message}`);
    process.exit(1);
  }

  // 6. 결과 표시
  console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
  console.log(`${CYAN}📋 수집된 영상 목록 (${videos.length}개)${NC}`);
  console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n`);

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    console.log(`  ${(i + 1).toString().padStart(3)}. ${v.title}`);
    console.log(`       재생시간: ${v.durationFormatted} | YouTube ID: ${v.youtubeId}`);
    if (v.publishedAt) {
      const date = new Date(v.publishedAt).toLocaleDateString('ko-KR');
      console.log(`       게시일: ${date}`);
    }
    console.log('');
  }

  // 총 재생시간 계산
  const totalSeconds = videos.reduce((sum, v) => sum + v.durationSeconds, 0);
  console.log(`   📊 총 영상 수: ${videos.length}개`);
  console.log(`   ⏱️  총 재생시간: ${formatDuration(totalSeconds)}`);
  console.log('');

  // 7. Dry-run이면 여기서 종료
  if (isDryRun) {
    console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
    console.log(`${YELLOW}📝 미리보기 모드: 실제 데이터베이스에는 저장되지 않았습니다.${NC}`);
    console.log(`${YELLOW}   실제 가져오기를 하려면 --dry-run 옵션 없이 실행해 주세요.${NC}`);
    console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n`);
    process.exit(0);
  }

  // 8. 데이터베이스에 업로드
  printStep('데이터베이스에 영상 등록');
  try {
    const { success, failed } = await uploadVideos(videos, config);

    console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
    console.log(`${GREEN}🎉 YouTube 영상 가져오기 완료!${NC}`);
    console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n`);
    console.log(`   📺 채널: ${channelTitle}`);
    console.log(`   ✅ 성공: ${success}개`);
    if (failed > 0) {
      console.log(`   ❌ 실패: ${failed}개`);
    }
    console.log(`   📊 총 영상: ${videos.length}개`);
    console.log(`   ⏱️  총 재생시간: ${formatDuration(totalSeconds)}`);
    console.log('');

    if (failed > 0) {
      printInfo('일부 영상 업로드에 실패했습니다. 위의 오류 메시지를 확인해 주세요.');
    }
  } catch (err) {
    printError(`영상 업로드 실패: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  printError(`예기치 않은 오류: ${err.message}`);
  if (err.stack) {
    console.error(`\n${RED}스택 트레이스:${NC}`);
    console.error(err.stack);
  }
  process.exit(1);
});
