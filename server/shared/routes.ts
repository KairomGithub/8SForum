import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPostSchema, insertCommentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/posts", async (_req, res) => {
    const posts = await storage.getPosts();
    res.json(posts);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).send("User not found");
    res.json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.id !== Number(req.params.id)) return res.sendStatus(403);

    const user = await storage.updateUser(req.user!.id, req.body);
    res.json(user);
  });

  app.get("/api/users/:id/posts", async (req, res) => {
    const posts = await storage.getPostsByUser(Number(req.params.id));
    res.json(posts);
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    const followers = await storage.getFollowers(Number(req.params.id));
    res.json(followers);
  });

  app.get("/api/users/:id/following", async (req, res) => {
    const following = await storage.getFollowing(Number(req.params.id));
    res.json(following);
  });

  app.post("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.followUser(req.user!.id, Number(req.params.id));
    res.sendStatus(200);
  });

  app.post("/api/users/:id/unfollow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.unfollowUser(req.user!.id, Number(req.params.id));
    res.sendStatus(200);
  });

  app.get("/api/feed", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const posts = await storage.getFeedPosts(req.user!.id);
    res.json(posts);
  });

  app.get("/api/posts/category/:category", async (req, res) => {
    const posts = await storage.getPostsByCategory(req.params.category);
    res.json(posts);
  });

  app.get("/api/posts/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    const posts = await storage.searchPosts(query);
    res.json(posts);
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validation = insertPostSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validation.error);
    }

    const post = await storage.createPost({
      ...validation.data,
      authorId: req.user!.id,
    });
    res.status(201).json(post);
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    const comments = await storage.getCommentsByPostId(Number(req.params.id));
    res.json(comments);
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validation = insertCommentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validation.error);
    }

    const comment = await storage.createComment({
      ...validation.data,
      postId: Number(req.params.id),
      authorId: req.user!.id,
    });
    res.status(201).json(comment);
  });

  const httpServer = createServer(app);
  return httpServer;
}