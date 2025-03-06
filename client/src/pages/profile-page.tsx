import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2, CheckCircle, UserPlus, UserMinus } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import { Post } from "@shared/schema";
import PostCard from "@/components/post-card";

export default function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const params = useParams();
  const userId = params.id ? Number(params.id) : user?.id;

  const { data: profile } = useQuery({
    queryKey: [`/api/users/${userId}`],
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/posts`],
  });

  const { data: followers = [] } = useQuery({
    queryKey: [`/api/users/${userId}/followers`],
  });

  const { data: following = [] } = useQuery({
    queryKey: [`/api/users/${userId}/following`],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<typeof profile>) => {
      await apiRequest("PATCH", `/api/users/${userId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      setEditing(false);
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/followers`] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${userId}/unfollow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/followers`] });
    },
  });

  const isOwnProfile = user?.id === userId;
  const isFollowing = followers.some(f => f.id === user?.id);

  function handleEdit() {
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setEditing(true);
  }

  function handleSave() {
    updateProfileMutation.mutate({
      displayName,
      bio,
    });
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="relative">
        {profile?.coverUrl ? (
          <img
            src={profile.coverUrl}
            alt="Cover"
            className="w-full h-48 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-48 bg-muted rounded-lg" />
        )}

        <div className="absolute -bottom-16 left-6 flex items-end gap-4">
          <Avatar className="h-32 w-32 border-4 border-background">
            <AvatarImage src={profile?.avatarUrl} />
            <AvatarFallback>
              {profile?.displayName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="pt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{profile?.displayName}</h1>
            {profile?.isVerified && (
              <CheckCircle className="h-6 w-6 text-primary fill-primary" />
            )}
          </div>

          {isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={editing ? handleSave : handleEdit}
              disabled={updateProfileMutation.isPending}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {editing ? "Lưu thay đổi" : "Chỉnh sửa"}
            </Button>
          ) : (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Bỏ theo dõi
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Theo dõi
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 text-muted-foreground mt-1">
          <span>@{profile?.username}</span>
          <span>{followers.length} người theo dõi</span>
          <span>Đang theo dõi {following.length} người</span>
        </div>

        {editing ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="font-medium">Tên hiển thị</label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium">Giới thiệu</label>
              <Textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Viết gì đó về bản thân..."
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 whitespace-pre-wrap">{profile?.bio}</p>
        )}
      </div>

      <div className="grid gap-4">
        <h2 className="text-2xl font-bold">Bài viết</h2>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Chưa có bài viết nào
          </div>
        )}
      </div>
    </div>
  );
}