/**
 * Google OAuth 헬퍼 모듈
 * 
 * YouTube Data API 등을 위한 Google OAuth 2.0 인증을 처리합니다.
 * 외부 의존성 없이 Node.js 내장 모듈만 사용합니다.
 * 
 * 사용법:
 *   import { getAccessToken } from './google-oauth-helper.mjs';
 *   const token = await getAccessToken(clientId, clientSecret, ['https://www.googleapis.com/auth/youtube.readonly']);
 */

import http from 'node:http';
import https from 'node:https';
import { URL, URLSearchParams } from 'node:url';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth/callback`;

/**
 * HTTPS GET 요청을 수행합니다.
 * @param {string} url - 요청 URL
 * @returns {Promise<{statusCode: number, data: string}>}
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * HTTPS POST 요청을 수행합니다.
 * @param {string} url - 요청 URL
 * @param {string} body - 요청 본문
 * @param {Record<string, string>} headers - 요청 헤더
 * @returns {Promise<{statusCode: number, data: string}>}
 */
function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * 운영체제에 맞는 브라우저를 엽니다.
 * @param {string} url - 열 URL
 */
function openBrowser(url) {
  const os = platform();
  let command;

  switch (os) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      // Linux 등
      command = `xdg-open "${url}"`;
      break;
  }

  exec(command, (err) => {
    if (err) {
      console.error(`\n⚠️  브라우저를 자동으로 열 수 없습니다. 아래 URL을 직접 브라우저에 붙여넣어 주세요:\n`);
      console.log(`   ${url}\n`);
    }
  });
}

/**
 * OAuth 인증 코드를 받기 위한 로컬 HTTP 서버를 시작합니다.
 * @returns {Promise<{code: string, server: http.Server}>}
 */
function startRedirectServer() {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);

      if (reqUrl.pathname === '/oauth/callback') {
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 40px;">
              <h2>❌ 인증이 거부되었습니다</h2>
              <p>오류: ${error}</p>
              <p>이 창을 닫고 다시 시도해 주세요.</p>
            </body></html>
          `);
          if (!resolved) {
            resolved = true;
            reject(new Error(`Google OAuth 인증이 거부되었습니다: ${error}`));
          }
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 40px;">
              <h2>✅ 인증이 완료되었습니다!</h2>
              <p>이 창을 닫아도 됩니다.</p>
              <p style="color: #666;">잠시 후 자동으로 처리됩니다...</p>
            </body></html>
          `);
          if (!resolved) {
            resolved = true;
            resolve({ code, server });
          }
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('잘못된 요청입니다.');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(
          `포트 ${REDIRECT_PORT}이(가) 이미 사용 중입니다. ` +
          `다른 프로그램이 이 포트를 사용하고 있다면 종료한 후 다시 시도해 주세요.`
        ));
      } else {
        reject(err);
      }
    });

    // 5분 타임아웃
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.close();
        reject(new Error('인증 시간이 초과되었습니다 (5분). 다시 시도해 주세요.'));
      }
    }, 5 * 60 * 1000);

    server.listen(REDIRECT_PORT, () => {
      console.log(`ℹ️  인증 서버가 포트 ${REDIRECT_PORT}에서 대기 중입니다...`);
    });

    // 서버 종료 시 타임아웃 정리
    server.on('close', () => clearTimeout(timeout));
  });
}

/**
 * 인증 코드를 액세스 토큰으로 교환합니다.
 * @param {string} code - OAuth 인증 코드
 * @param {string} clientId - Google OAuth 클라이언트 ID
 * @param {string} clientSecret - Google OAuth 클라이언트 시크릿
 * @returns {Promise<string>} 액세스 토큰
 */
async function exchangeCodeForToken(code, clientId, clientSecret) {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await httpsPost(
    'https://oauth2.googleapis.com/token',
    params.toString()
  );

  if (response.statusCode !== 200) {
    let errorMessage = '알 수 없는 오류';
    try {
      const errorData = JSON.parse(response.data);
      errorMessage = errorData.error_description || errorData.error || errorMessage;
    } catch {
      errorMessage = response.data;
    }
    throw new Error(`토큰 교환 실패 (HTTP ${response.statusCode}): ${errorMessage}`);
  }

  const tokenData = JSON.parse(response.data);

  if (!tokenData.access_token) {
    throw new Error('응답에 액세스 토큰이 포함되어 있지 않습니다.');
  }

  return tokenData.access_token;
}

/**
 * Google OAuth 2.0 인증을 수행하고 액세스 토큰을 반환합니다.
 * 
 * 1. 인증 URL을 생성합니다.
 * 2. 브라우저를 열어 사용자 인증을 요청합니다.
 * 3. 로컬 HTTP 서버에서 리다이렉트를 수신합니다.
 * 4. 인증 코드를 액세스 토큰으로 교환합니다.
 * 
 * @param {string} clientId - Google OAuth 클라이언트 ID
 * @param {string} clientSecret - Google OAuth 클라이언트 시크릿
 * @param {string[]} scopes - 요청할 OAuth 스코프 배열
 * @returns {Promise<string>} 액세스 토큰
 */
export async function getAccessToken(clientId, clientSecret, scopes) {
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth 클라이언트 ID와 시크릿이 필요합니다.\n' +
      'org.config.json의 youtube.clientId와 youtube.clientSecret을 확인해 주세요.\n\n' +
      'Google Cloud Console (https://console.cloud.google.com) 에서\n' +
      '"OAuth 2.0 클라이언트 ID"를 생성하고 리다이렉트 URI에\n' +
      `"${REDIRECT_URI}"를 추가해야 합니다.`
    );
  }

  // 1. 인증 URL 생성
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Google 계정 인증');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('ℹ️  브라우저가 열리면 Google 계정으로 로그인해 주세요.');
  console.log('ℹ️  YouTube 채널에 접근할 수 있는 계정을 선택해 주세요.\n');

  // 2. 리다이렉트 서버 시작
  const serverPromise = startRedirectServer();

  // 3. 브라우저 열기
  openBrowser(authUrl);

  // 4. 인증 코드 수신 대기
  console.log('⏳ 브라우저에서 인증을 완료해 주세요...\n');

  const { code, server } = await serverPromise;

  console.log('✅ 인증 코드를 수신했습니다. 토큰을 발급합니다...');

  // 5. 토큰 교환
  try {
    const accessToken = await exchangeCodeForToken(code, clientId, clientSecret);
    console.log('✅ 액세스 토큰이 성공적으로 발급되었습니다.\n');
    return accessToken;
  } finally {
    // 서버 종료
    server.close();
  }
}

// 내부 유틸리티 함수도 export (테스트용)
export { httpsGet, httpsPost, openBrowser, REDIRECT_URI, REDIRECT_PORT };
