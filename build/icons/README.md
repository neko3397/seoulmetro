# 앱 아이콘 가이드

PWA 웹앱을 위해 다음 크기의 아이콘들이 필요합니다:

## 필요한 아이콘 크기들

1. **icon-16x16.png** - 브라우저 탭 파비콘
2. **icon-32x32.png** - 브라우저 북마크 아이콘  
3. **icon-192x192.png** - Android 홈화면 아이콘
4. **icon-512x512.png** - 고해상도 앱 아이콘 및 스플래시 스크린

## 아이콘 위치
모든 아이콘은 `public/icons/` 폴더에 위치합니다:

```
public/
├── icons/
│   ├── icon-16x16.png
│   ├── icon-32x32.png  
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── manifest.json
```

## 아이콘 생성 방법

### 방법 1: 온라인 도구 사용
- [Favicon.io](https://favicon.io/) - 텍스트나 이미지에서 아이콘 생성
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) - Microsoft의 PWA 아이콘 생성기

### 방법 2: 수동 생성
1. 512x512 크기의 원본 이미지 준비
2. 이미지 편집 프로그램(Photoshop, GIMP 등)으로 각 크기로 리사이즈
3. PNG 형식으로 저장

## 아이콘 디자인 가이드라인

- **정사각형 비율** 유지 (1:1)
- **단순하고 명확한** 디자인
- **고대비** 색상 사용
- **텍스트 최소화** (작은 크기에서 읽기 어려움)
- **배경 투명** 또는 브랜드 색상 사용

## 테스트 방법

1. Chrome DevTools > Application 탭에서 Manifest 확인
2. "Add to Home Screen" 기능 테스트
3. Lighthouse PWA 점수 확인

## 현재 상태

✅ manifest.json 생성 완료
✅ index.html에 아이콘 링크 추가 완료
❌ 아이콘 파일들 생성 필요

다음 단계: 위 크기들로 아이콘 이미지를 생성하여 `public/icons/` 폴더에 저장하세요.