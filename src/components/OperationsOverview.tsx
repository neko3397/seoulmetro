import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MessageSquare, FileText, Heart, Bot, BookOpen, Users } from "lucide-react";
import { apiRequest } from "../lib/api";

interface OverviewProps {
  refreshToken: number;
}

export function OperationsOverview({ refreshToken }: OverviewProps) {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    comments: 0,
    likes: 0,
    guides: 0,
    indexedChunks: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [usersRes, postsRes, guidesRes, indexRes] = await Promise.all([
          apiRequest("/users"),
          apiRequest("/community/posts?includeDrafts=true"),
          apiRequest("/guides?includeDrafts=true"),
          apiRequest("/admin/ai/index-status"),
        ]);

        const [usersData, postsData, guidesData, indexData] = await Promise.all([
          usersRes.json(),
          postsRes.json(),
          guidesRes.json(),
          indexRes.json(),
        ]);

        const posts = postsData.posts || [];
        if (!cancelled) {
          setStats({
            users: usersData.users?.length || 0,
            posts: posts.length,
            comments: posts.reduce((sum: number, post: any) => sum + (post.commentCount || 0), 0),
            likes: posts.reduce((sum: number, post: any) => sum + (post.likeCount || 0), 0),
            guides: guidesData.guides?.length || 0,
            indexedChunks: indexData.status?.chunkCount || 0,
          });
        }
      } catch (error) {
        console.error("Failed to load operations overview:", error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const cards = [
    { label: "총 사용자", value: stats.users, icon: Users },
    { label: "게시물", value: stats.posts, icon: FileText },
    { label: "댓글", value: stats.comments, icon: MessageSquare },
    { label: "좋아요", value: stats.likes, icon: Heart },
    { label: "가이드북", value: stats.guides, icon: BookOpen },
    { label: "색인 청크", value: stats.indexedChunks, icon: Bot },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
