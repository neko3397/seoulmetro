import { ArrowLeft, BookOpen, FileImage, FileText, Play, Sparkles, Video as VideoIcon } from "lucide-react";
import { UserCommunityComposer } from "../../components/UserCommunityComposer";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FeedItem } from "../../types/content";
import { formatDateTime } from "../utils";
import { primaryNavButtonClassName, primaryNavButtonTextStyle } from "../constants";

interface HomeFeedPageProps {
  currentUser: any;
  attendanceRate: number;
  isComposerOpen: boolean;
  feedLoading: boolean;
  feedItems: FeedItem[];
  onToggleComposer: () => void;
  onRefreshFeed: () => void;
  onSubmittedComposer: () => void;
  onCloseComposer: () => void;
  onOpenEducationVideos: () => void;
  onOpenWikiDocs: () => void;
  onOpenPersonalizedEducation: () => void;
  onSelectFeedItem: (item: FeedItem) => void | Promise<void>;
}

export function HomeFeedPage({
  currentUser,
  attendanceRate,
  isComposerOpen,
  feedLoading,
  feedItems,
  onToggleComposer,
  onRefreshFeed,
  onSubmittedComposer,
  onCloseComposer,
  onOpenEducationVideos,
  onOpenWikiDocs,
  onOpenPersonalizedEducation,
  onSelectFeedItem,
}: HomeFeedPageProps) {
  const renderFeedItem = (item: FeedItem) => {
    const icon =
      item.itemType === "video" ? (
        <VideoIcon className="h-4 w-4" />
      ) : item.itemType === "image" ? (
        <FileImage className="h-4 w-4" />
      ) : (
        <FileText className="h-4 w-4" />
      );

    if (item.itemType !== "video") {
      return (
        <Card
          key={item.id}
          className="overflow-hidden border-0 bg-white/90 shadow-lg shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <button type="button" onClick={() => void onSelectFeedItem(item)} className="block w-full text-left">
            {item.itemType === "image" ? (
              <div className="relative border-b bg-slate-50">
                <div className="absolute left-4 top-4 z-10">
                  <Badge className="bg-slate-900/85 text-white">
                    {icon}
                    이미지 게시물
                  </Badge>
                </div>
                <img src={item.thumbnailUrl} alt={item.title} className="h-72 w-full object-cover" />
              </div>
            ) : (
              <div className="px-6 pt-6">
                <Badge className="bg-slate-900/85 text-white">
                  {icon}
                  문서 게시물
                </Badge>
              </div>
            )}
            <div className="flex flex-col justify-between p-6">
              <div className="space-y-3">
                <p className="text-sm text-slate-500">{formatDateTime(item.publishedAt)}</p>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h3>
                <p className="line-clamp-4 text-base leading-relaxed text-slate-600">{item.summary}</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-700">
                <span>상세페이지 보기</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </div>
            </div>
          </button>
        </Card>
      );
    }

    return (
      <Card
        key={item.id}
        className="overflow-hidden border-0 bg-white/90 shadow-lg shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <button type="button" onClick={() => void onSelectFeedItem(item)} className="block w-full text-left">
          <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-56 overflow-hidden bg-slate-100">
              <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
              <div className="absolute left-4 top-4">
                <Badge className="bg-slate-900/85 text-white">
                  {icon}
                  교육영상
                </Badge>
              </div>
            </div>
            <div className="flex flex-col justify-between p-6">
              <div className="space-y-3">
                <p className="text-sm text-slate-500">{formatDateTime(item.publishedAt)}</p>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h3>
                <p className="line-clamp-4 text-base leading-relaxed text-slate-600">{item.summary}</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-700">
                <span>상세페이지 보기</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </div>
            </div>
          </div>
        </button>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-1">
      <section className="pb-2 text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
          환영합니다 {currentUser?.name || "사용자"}님 🎉
        </h2>
        <p className="mt-3 text-lg text-slate-600 md:text-xl">이번달 출석률은 {attendanceRate}%입니다!</p>
      </section>

      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_46%,#38bdf8_100%)] px-6 py-0 text-white shadow-2xl shadow-blue-200/40 md:px-10">
        <div className="mb-4 flex max-w-3xl gap-3">
          <button
            type="button"
            onClick={onOpenEducationVideos}
            className={`${primaryNavButtonClassName} min-w-0 flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <Play className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              교육영상
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenWikiDocs}
            className={`${primaryNavButtonClassName} min-w-0 flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <BookOpen className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              위키문서
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenPersonalizedEducation}
            className={`${primaryNavButtonClassName} min-w-0 flex-1`}
            style={primaryNavButtonTextStyle}
          >
            <Sparkles className="h-5 w-5 shrink-0 text-slate-900" />
            <span className="text-sm font-medium leading-tight text-slate-900" style={primaryNavButtonTextStyle}>
              맞춤형 교육
            </span>
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 pb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">최신 게시물</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={isComposerOpen ? "secondary" : "default"} onClick={onToggleComposer}>
              {isComposerOpen ? "글쓰기 닫기" : "글쓰기"}
            </Button>
            <Button variant="outline" onClick={onRefreshFeed} disabled={feedLoading}>
              {feedLoading ? "새로고침 중..." : "새로고침"}
            </Button>
          </div>
        </div>
        {isComposerOpen ? (
          <UserCommunityComposer
            currentUser={currentUser}
            onSubmitted={onSubmittedComposer}
            onClose={onCloseComposer}
          />
        ) : null}
        <div className="space-y-6">{feedItems.map(renderFeedItem)}</div>
      </section>
    </div>
  );
}
