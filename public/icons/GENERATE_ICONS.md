# 임시 아이콘 파일 생성 가이드

아이콘 파일들이 필요합니다. 아래 명령어로 간단한 임시 아이콘을 생성하거나, 
디자인된 아이콘을 직접 추가하세요.

## ImageMagick을 사용한 임시 아이콘 생성 (선택사항)

```bash
# ImageMagick 설치 (macOS)
brew install imagemagick

# 임시 아이콘 생성 (파란색 배경에 흰색 텍스트)
convert -size 512x512 -background "#1f2937" -fill white -gravity center -font Arial-Bold -pointsize 200 label:"동" public/icons/icon-512x512.png
convert -size 192x192 -background "#1f2937" -fill white -gravity center -font Arial-Bold -pointsize 80 label:"동" public/icons/icon-192x192.png  
convert -size 32x32 -background "#1f2937" -fill white -gravity center -font Arial-Bold -pointsize 16 label:"동" public/icons/icon-32x32.png
convert -size 16x16 -background "#1f2937" -fill white -gravity center -font Arial-Bold -pointsize 8 label:"동" public/icons/icon-16x16.png
```

## 또는 온라인 도구 사용

1. [Favicon.io](https://favicon.io/favicon-generator/)에서 "불안제로" 텍스트로 아이콘 생성
2. 생성된 아이콘들을 `public/icons/` 폴더에 저장

## 현재 PWA 설정 상태

✅ manifest.json 생성 완료
✅ index.html에 PWA 메타 태그 추가 완료  
✅ vite.config.ts에 PWA 플러그인 설정 완료
❌ 아이콘 파일들 필요 (icon-16x16.png, icon-32x32.png, icon-192x192.png, icon-512x512.png)

아이콘 파일들을 추가한 후 `npm run build`를 실행하면 PWA가 준비됩니다.