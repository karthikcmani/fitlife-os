import { db } from '../db/database';
import { sql } from 'kysely';

export interface CreatePostDto {
  userId: string;
  title: string;
  content?: string;
  workoutSessionId?: string;
}

export interface CreateCommentDto {
  userId: string;
  postId: string;
  content: string;
}

export interface CreateChallengeDto {
  createdBy: string;
  title: string;
  description?: string;
  targetType: string;
  targetValue: number;
  startDate: string;
  endDate: string;
}

export class CommunityService {
  async getFeed(limit = 20, offset = 0) {
    return sql<any>`
      SELECT 
        p.id, 
        p.user_id as "userId", 
        u.username, 
        p.title, 
        p.content, 
        p.workout_session_id as "workoutSessionId",
        p.likes_count as "likesCount", 
        p.created_at as "createdAt",
        (SELECT COUNT(*) FROM activity_comments c WHERE c.post_id = p.id) as "commentsCount"
      FROM activity_posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.privacy_level = 'public'
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);
  }

  async createPost(dto: CreatePostDto) {
    const rows = await sql<any>`
      INSERT INTO activity_posts (user_id, title, content, workout_session_id)
      VALUES (${dto.userId}, ${dto.title}, ${dto.content || null}, ${dto.workoutSessionId || null})
      RETURNING id, user_id as "userId", title, content, created_at as "createdAt"
    `.execute(db);
    return rows.rows[0];
  }

  async toggleLike(postId: string, userId: string) {
    // Check if like exists
    const existing = await sql<any>`
      SELECT id FROM activity_likes WHERE post_id = ${postId} AND user_id = ${userId}
    `.execute(db);

    if (existing.rows.length > 0) {
      // Remove like
      await sql`DELETE FROM activity_likes WHERE post_id = ${postId} AND user_id = ${userId}`.execute(db);
      await sql`UPDATE activity_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ${postId}`.execute(db);
      return { liked: false };
    } else {
      // Add like
      await sql`INSERT INTO activity_likes (post_id, user_id) VALUES (${postId}, ${userId})`.execute(db);
      await sql`UPDATE activity_posts SET likes_count = likes_count + 1 WHERE id = ${postId}`.execute(db);
      return { liked: true };
    }
  }

  async addComment(dto: CreateCommentDto) {
    const rows = await sql<any>`
      INSERT INTO activity_comments (post_id, user_id, content)
      VALUES (${dto.postId}, ${dto.userId}, ${dto.content})
      RETURNING id, post_id as "postId", user_id as "userId", content, created_at as "createdAt"
    `.execute(db);
    return rows.rows[0];
  }

  async getChallenges() {
    return sql<any>`
      SELECT 
        c.id, 
        c.title, 
        c.description, 
        c.category, 
        c.target_type as "targetType", 
        c.target_value as "targetValue",
        c.start_date as "startDate", 
        c.end_date as "endDate",
        COUNT(cp.id) as "participantsCount"
      FROM challenges c
      LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
      GROUP BY c.id
      ORDER BY c.start_date DESC
    `.execute(db);
  }

  async joinChallenge(challengeId: string, userId: string) {
    const rows = await sql<any>`
      INSERT INTO challenge_participants (challenge_id, user_id)
      VALUES (${challengeId}, ${userId})
      ON CONFLICT (challenge_id, user_id) DO NOTHING
      RETURNING id, challenge_id as "challengeId", user_id as "userId", current_progress as "currentProgress"
    `.execute(db);
    return rows.rows[0] || { message: 'Already joined' };
  }
}

export const communityService = new CommunityService();
