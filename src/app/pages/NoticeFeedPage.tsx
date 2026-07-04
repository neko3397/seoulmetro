import { ArrowLeft, FileImage, FileText, Video as VideoIcon } from "lucide-react";
import { UserCommunityComposer } from "../../components/UserCommunityComposer";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FeedItem } from "../../types/content";
import { formatDate, formatDateTime } from "../utils";

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


    return (
      <Card
        key={item.id}
        className="group relative overflow-hidden border border-slate-100/80 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5 transition-all duration-300 rounded-2xl premium-card"
      >
        <button
          type="button"
          onClick={() => void onSelectFeedItem(item)}
          className="block w-full text-left"
        >
          <div className="flex items-center gap-4 p-5 md:p-6">
            {/* Left Accent strip */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* Media Thumbnail or Type Icon */}
            <div className="flex-shrink-0 relative pl-1.5">
              {item.thumbnailUrl && item.itemType !== "document" ? (
                <div className="relative h-16 w-16 md:h-20 md:w-20 overflow-hidden rounded-2xl border border-slate-100 shadow-sm bg-slate-50">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/5" />
                  <div className="absolute bottom-1 right-1 bg-slate-900/80 p-1 rounded-md text-white">
                    {icon}
                  </div>
                </div>
              ) : (
                <div className={`flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${
                  item.itemType === "video"
                    ? "from-indigo-50 to-indigo-100/80 text-indigo-600"
                    : "from-blue-50 to-blue-100/80 text-blue-600"
                } border border-slate-100 shadow-sm`}>
                  <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-500">
                    {icon}
                  </div>
                </div>
              )}
            </div>

            {/* Text content area */}
            <div className="flex-1 min-w-0 space-y-2.5">
              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                {item.title}
              </h3>

              {/* Meta details row: Badge, Date, Name */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 font-medium">
                <Badge
                  variant="outline"
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    item.itemType === "video"
                      ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50"
                      : item.itemType === "image"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  {item.itemType === "video" ? "교육영상" : item.itemType === "image" ? "이미지 공지" : "문서 공지"}
                </Badge>

                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full text-slate-600">
                  {formatDate(item.publishedAt)}
                </span>
              </div>
            </div>

            {/* Right Arrow Action */}
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-400 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 rotate-180 group-hover:translate-x-0.5 transition-transform" />
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
