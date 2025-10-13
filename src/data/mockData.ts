import { Topic, Video } from "../types/video";

export const topics: Topic[] = [
  {
    id: "emergency",
    title: "비상대응 조치",
    description: "비상상황 발생 시 승무원 대응방법",
    thumbnail: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
    videoCount: 2,
  },
  {
    id: "troubleshooting",
    title: "고장조치 및 기기 취급",
    description: "고장 발생 시 기기 취급 방법",
    thumbnail:
      "https://images.unsplash.com/photo-1706444739572-7d35d73fb1bb?w=400&h=300&fit=crop",
    videoCount: 3,
  },
  {
    id: "basic",
    title: "기본 업무",
    description: "승무원의 기본 업무 능력 숙달",
    thumbnail:
      "https://images.unsplash.com/photo-1621770401232-39a944faa2df?w=400&h=300&fit=crop",
    videoCount: 2,
  },
];

export const videos: Record<string, Video[]> = {
  fire: [
    {
      id: "fire-1",
      title: "지하철 화재 발생 시 초기 대응",
      description: "지하철에서 화재가 발생했을 때 승무원이 취해야 할 초기 대응 방법을 학습합니다.",
      youtubeId: "dQw4w9WgXcQ",
      videoType: "youtube",
      duration: 330,
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      category: "fire",
    },
    {
      id: "fire-2",
      title: "승객 대피 유도 방법",
      description: "화재 발생 시 승객을 안전하게 대피시키는 방법과 유의사항을 학습합니다.",
      youtubeId: "dQw4w9WgXcQ",
      videoType: "youtube",
      duration: 435,
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      category: "fire",
    },
  ],
  troubleshooting: [
    {
      id: "js-1",
      title: "JavaScript 변수와 데이터 타입",
      description:
        "JavaScript의 기본 변수 선언 방법과 다양한 데이터 타입에 대해 알아봅니다. let, const, var의 차이점과 원시 타입, 참조 타입의 특징을 학습합니다.",
      youtubeId: "W6NZfCO5SIk",
      videoType: "youtube",
      duration: 1200,
      thumbnail:
        "https://img.youtube.com/vi/W6NZfCO5SIk/mqdefault.jpg",
      category: "troubleshooting",
    },
  ],
  basic: [
    {
      id: "react-1",
      title: "React 시작하기",
      description:
        "React의 기본 개념과 컴포넌트 기반 개발 방식을 이해합니다. JSX 문법과 가상 DOM의 동작 원리를 학습합니다.",
      youtubeId: "Ke90Tje7VS0",
      videoType: "youtube",
      duration: 1680,
      thumbnail:
        "https://img.youtube.com/vi/Ke90Tje7VS0/mqdefault.jpg",
      category: "react",
    },
    {
      id: "react-2",
      title: "State와 Props",
      description:
        "React 컴포넌트의 state와 props를 활용한 데이터 관리 방법을 학습합니다.",
      youtubeId: "O6P86uwfdR0",
      videoType: "youtube",
      duration: 1440,
      thumbnail:
        "https://img.youtube.com/vi/O6P86uwfdR0/mqdefault.jpg",
      category: "react",
    },
    {
      id: "react-3",
      title: "React Hooks 완전정복",
      description:
        "useState, useEffect를 비롯한 다양한 React Hooks의 사용법을 마스터합니다.",
      youtubeId: "TNhaISOUy6Q",
      videoType: "youtube",
      duration: 2400,
      thumbnail:
        "https://img.youtube.com/vi/TNhaISOUy6Q/mqdefault.jpg",
      category: "react",
    },
  ],
};