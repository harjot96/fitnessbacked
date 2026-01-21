import { PrismaClient } from '@prisma/client';

export interface CreateFeedPostInput {
  content: string;
  tags?: string[];
  mood?: string;
  visibility?: 'public' | 'friends';
  stats?: {
    steps?: number;
    caloriesBurned?: number;
    waterIntake?: number;
  };
}

export class FeedService {
  constructor(private prisma: PrismaClient) {}

  private async getFriendUids(userId: string): Promise<string[]> {
    const friends = await this.prisma.friend.findMany({
      where: { userId },
      select: { friendUid: true },
    });

    return friends.map((friend) => friend.friendUid);
  }

  private async getAccessiblePost(postId: string, userId: string) {
    const friendUids = await this.getFriendUids(userId);
    const allowed = [userId, ...friendUids];

    return this.prisma.feedPost.findFirst({
      where: {
        id: postId,
        OR: [
          { visibility: 'public' },
          { visibility: 'friends', userId: { in: allowed } },
        ],
      },
    });
  }

  async createPost(userId: string, input: CreateFeedPostInput) {
    const post = await this.prisma.feedPost.create({
      data: {
        userId,
        content: input.content,
        tags: input.tags || [],
        mood: input.mood || null,
        visibility: input.visibility || 'public',
        stats: input.stats || undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
          },
        },
      },
    });

    return {
      ...post,
      user: post.user,
      hasLiked: false,
    };
  }

  async listPosts(userId: string, limitCount: number, cursor?: string) {
    const friendUids = await this.getFriendUids(userId);
    const allowed = [userId, ...friendUids];

    const posts = await this.prisma.feedPost.findMany({
      where: {
        OR: [
          { visibility: 'public' },
          { visibility: 'friends', userId: { in: allowed } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limitCount,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    return posts.map((post) => ({
      ...post,
      user: post.user,
      hasLiked: post.likes.length > 0,
    }));
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.getAccessiblePost(postId, userId);
    if (!post) {
      throw new Error('Post not found');
    }

    const existing = await this.prisma.feedPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.feedPostLike.delete({
          where: { postId_userId: { postId, userId } },
        }),
        this.prisma.feedPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      return false;
    }

    await this.prisma.$transaction([
      this.prisma.feedPostLike.create({
        data: { postId, userId },
      }),
      this.prisma.feedPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return true;
  }

  async addComment(postId: string, userId: string, text: string) {
    const post = await this.getAccessiblePost(postId, userId);
    if (!post) {
      throw new Error('Post not found');
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.feedComment.create({
        data: {
          postId,
          userId,
          text,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              photoURL: true,
            },
          },
        },
      });

      await tx.feedPost.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });

      return created;
    });

    return comment;
  }

  async listComments(userId: string, postId: string, limitCount: number, cursor?: string) {
    const post = await this.getAccessiblePost(postId, userId);
    if (!post) {
      throw new Error('Post not found');
    }

    const comments = await this.prisma.feedComment.findMany({
      where: { postId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limitCount,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
          },
        },
      },
    });

    return comments;
  }
}
