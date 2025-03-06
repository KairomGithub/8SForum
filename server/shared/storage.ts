import { User, InsertUser, Post, Comment, Follower } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post>;
  getPosts(): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostsByCategory(category: string): Promise<Post[]>;
  searchPosts(query: string): Promise<Post[]>;
  getPostsByUser(userId: number): Promise<Post[]>;
  getFeedPosts(userId: number): Promise<Post[]>;

  createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<Comment[]>;

  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private comments: Map<number, Comment>;
  private followers: Map<number, Follower>;
  private currentUserId: number;
  private currentPostId: number;
  private currentCommentId: number;
  private currentFollowerId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.followers = new Map();
    this.currentUserId = 1;
    this.currentPostId = 1;
    this.currentCommentId = 1;
    this.currentFollowerId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { 
      ...insertUser, 
      id,
      isVerified: insertUser.username === 'hgthazh'
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const id = this.currentPostId++;
    const newPost: Post = {
      ...post,
      id,
      createdAt: new Date(),
    };
    this.posts.set(id, newPost);
    return newPost;
  }

  async getPosts(): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.privacy === "public")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPostById(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getPostsByCategory(category: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.category === category && post.privacy === "public")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async searchPosts(query: string): Promise<Post[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.posts.values())
      .filter(post => 
        post.privacy === "public" && (
          post.title.toLowerCase().includes(lowercaseQuery) ||
          post.content.toLowerCase().includes(lowercaseQuery)
        )
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPostsByUser(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.authorId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFeedPosts(userId: number): Promise<Post[]> {
    const following = await this.getFollowing(userId);
    const followingIds = following.map(user => user.id);

    return Array.from(this.posts.values())
      .filter(post => 
        post.privacy === "public" && (
          followingIds.includes(post.authorId) || 
          post.authorId === userId
        )
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment> {
    const id = this.currentCommentId++;
    const newComment: Comment = {
      ...comment,
      id,
      createdAt: new Date(),
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async getCommentsByPostId(postId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async followUser(followerId: number, followingId: number): Promise<void> {
    if (followerId === followingId) return;
    if (await this.isFollowing(followerId, followingId)) return;

    const id = this.currentFollowerId++;
    const follower: Follower = {
      id,
      followerId,
      followingId,
      createdAt: new Date(),
    };
    this.followers.set(id, follower);
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    const follower = Array.from(this.followers.values()).find(
      f => f.followerId === followerId && f.followingId === followingId
    );
    if (follower) {
      this.followers.delete(follower.id);
    }
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followerIds = Array.from(this.followers.values())
      .filter(f => f.followingId === userId)
      .map(f => f.followerId);

    return Array.from(this.users.values())
      .filter(user => followerIds.includes(user.id));
  }

  async getFollowing(userId: number): Promise<User[]> {
    const followingIds = Array.from(this.followers.values())
      .filter(f => f.followerId === userId)
      .map(f => f.followingId);

    return Array.from(this.users.values())
      .filter(user => followingIds.includes(user.id));
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.followers.values()).some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }
}

export const storage = new MemStorage();