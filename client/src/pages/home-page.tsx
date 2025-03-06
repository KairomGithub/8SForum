import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Post } from "@shared/schema";
import PostCard from "@/components/post-card";
import CreatePostDialog from "@/components/create-post-dialog";
import { Search } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "General",
  "Questions",
  "Homework",
  "Announcements",
  "Resources",
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: [
      category
        ? `/api/posts/category/${category}`
        : search
        ? `/api/posts/search?q=${encodeURIComponent(search)}`
        : "/api/feed",
    ],
  });

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="Tìm kiếm bài viết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
            <Search className="absolute right-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tất cả chủ đề" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined}>Tất cả chủ đề</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CreatePostDialog />
      </div>

      <div className="grid gap-4">
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