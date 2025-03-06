import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Post, Comment } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
  });

  const { data: author } = useQuery({
    queryKey: [`/api/users/${post.authorId}`],
  });

  // Load commenters info
  const commentUsers = useQuery({
    queryKey: [`/api/users/comments`, comments.map(c => c.authorId)],
    enabled: comments.length > 0,
    queryFn: async () => {
      const users = await Promise.all(
        [...new Set(comments.map(c => c.authorId))].map(async (id) => {
          const res = await fetch(`/api/users/${id}`);
          return res.json();
        })
      );
      return Object.fromEntries(users.map(u => [u.id, u]));
    }
  });

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;

    await apiRequest("POST", `/api/posts/${post.id}/comments`, {
      content: comment,
    });
    queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
    setComment("");
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={author?.avatarUrl} />
              <AvatarFallback>
                {author?.displayName?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1">
              <p className="font-medium">{author?.displayName}</p>
              {author?.isVerified && (
                <CheckCircle className="h-4 w-4 text-primary fill-primary" />
              )}
              <p className="text-sm text-muted-foreground">
                {format(new Date(post.createdAt), "PP")}
              </p>
            </div>
          </div>
          <Badge variant="secondary">{post.category}</Badge>
        </div>
        <h3 className="text-xl font-semibold">{post.title}</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap">{post.content}</p>

        <div className="space-y-4">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="h-4 w-4" />
            {comments.length} Bình luận
          </Button>

          {showComments && (
            <div className="space-y-4">
              {user && (
                <form onSubmit={handleComment} className="flex gap-2">
                  <Input
                    placeholder="Viết bình luận..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button type="submit">Gửi</Button>
                </form>
              )}

              <div className="space-y-4">
                {comments.map((comment) => {
                  const commenter = commentUsers.data?.[comment.authorId];
                  return (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={commenter?.avatarUrl} />
                        <AvatarFallback>
                          {commenter?.displayName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium flex items-center gap-1">
                            {commenter?.displayName}
                            {commenter?.isVerified && (
                              <CheckCircle className="h-3 w-3 text-primary fill-primary" />
                            )}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {format(new Date(comment.createdAt), "PP")}
                          </span>
                        </p>
                        <p>{comment.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}