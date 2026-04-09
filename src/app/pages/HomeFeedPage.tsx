import { Bell, BookOpen, Bot, FolderOpen, Play, Sparkles, User } from "lucide-react";
import { primaryNavButtonClassName, primaryNavButtonTextStyle } from "../constants";

interface HomeFeedPageProps {
  currentUser: any;
  attendanceRate: number;
  onOpenEducationVideos: () => void;
  onOpenDocuments: () => void;
  onOpenWikiDocs: () => void;
  onOpenNotices: () => void;
  onOpenChatbot: () => void;
  onOpenPersonalizedEducation: () => void;
  onGoMyPage: () => void;
}

export function HomeFeedPage({
  currentUser,
  attendanceRate,
  onOpenEducationVideos,
  onOpenDocuments,
  onOpenWikiDocs,
  onOpenNotices,
  onOpenChatbot,
  onOpenPersonalizedEducation,
  onGoMyPage,
}: HomeFeedPageProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-1">
      <section className="pb-2 text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
          환영합니다 {currentUser?.name || "사용자"}님 🎉
        </h2>
        <p className="mt-3 text-lg text-slate-600 md:text-xl">이번달 출석률은 {attendanceRate}%입니다!</p>
      </section>

      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_46%,#38bdf8_100%)] px-6 py-0 text-white shadow-2xl shadow-blue-200/40 md:px-10">
        <div className="mb-4 grid max-w-3xl grid-cols-2 gap-3 md:flex">
          <button
            type="button"
            onClick={onOpenNotices}
            className={`${primaryNavButtonClassName} min-w-0 md:flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <Bell className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              업무공지
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenEducationVideos}
            className={`${primaryNavButtonClassName} min-w-0 md:flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <Play className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              교육영상
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenDocuments}
            className={`${primaryNavButtonClassName} min-w-0 md:flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <FolderOpen className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              문서
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenWikiDocs}
            className={`${primaryNavButtonClassName} min-w-0 md:flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <BookOpen className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              사내규정
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenChatbot}
            className={`${primaryNavButtonClassName} min-w-0 md:flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <Bot className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              AI 챗봇
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenPersonalizedEducation}
            className={`${primaryNavButtonClassName} min-w-0 md:flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <Sparkles className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              맞춤형교육
            </span>
          </button>
          <button
            type="button"
            onClick={onGoMyPage}
            className={`${primaryNavButtonClassName} min-w-0 md:flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <User className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              마이페이지
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
