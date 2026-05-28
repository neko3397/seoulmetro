import { ArrowLeft, FileImage, FileText, Video as VideoIcon } from "lucide-react";
import { UserCommunityComposer } from "../../components/UserCommunityComposer";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FeedItem } from "../../types/content";
import { formatDateTime } from "../utils";

interface NoticeFeedPageProps {
  currentUser: any;
  isComposerOpen: boolean;
  feedLoading: boolean;
  feedItems: FeedItem[];
  onToggleComposer: () => void;
  onRefreshFeed: () => void;
  onSubmittedComposer: () => void;
  onCloseComposer: () => void;
  onSelectFeedItem: (item: FeedItem) => void | Promise<void>;
}

export function NoticeFeedPage({
  currentUser,
  isComposerOpen,
  feedLoading,
  feedItems,
  onToggleComposer,
  onRefreshFeed,
  onSubmittedComposer,
  onCloseComposer,
  onSelectFeedItem,
}: NoticeFeedPageProps) {
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
          className="overflow-hidden border-0 premium-card"
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
        className="overflow-hidden border-0 premium-card"
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
    <section className="mx-auto max-w-3xl space-y-6 pb-8 animate-fade-in-up">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">업무공지</h2>
        <p className="text-slate-500 font-medium">최신 업무 공지와 중요 안내 사항을 한곳에서 신속하게 확인하세요.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div />
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
        <UserCommunityComposer currentUser={currentUser} onSubmitted={onSubmittedComposer} onClose={onCloseComposer} />
      ) : null}

      <div className="space-y-6">{feedItems.map(renderFeedItem)}</div>
    </section>
  );
}
