import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { SurfaceCard } from '../src/components/ui/SurfaceCard';
import { Button } from '../src/components/ui/Button';
import { Header } from '../src/components/ui/Header';
import { theme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';

interface Challenge {
  id: string;
  title: string;
  description: string;
  targetType: string;
  targetValue: number;
  participantsCount: number;
}

interface ActivityPost {
  id: string;
  username: string;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { backendUrl, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges'>('challenges');
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: 'ch_1',
      title: '30-Day Consistency Streak',
      description: 'Log any workout or habit at least 25 out of the next 30 days.',
      targetType: 'streak_days',
      targetValue: 25,
      participantsCount: 42,
    },
    {
      id: 'ch_2',
      title: '100 Ton Club (Volume)',
      description: 'Accumulate 100,000 kg total cumulative workout volume this month.',
      targetType: 'volume_kg',
      targetValue: 100000,
      participantsCount: 18,
    },
    {
      id: 'ch_3',
      title: 'Hydration Mastery',
      description: 'Meet your daily water target 7 days in a row.',
      targetType: 'streak_days',
      targetValue: 7,
      participantsCount: 65,
    },
  ]);
  const [posts, setPosts] = useState<ActivityPost[]>([
    {
      id: 'post_1',
      username: 'alex_f',
      title: 'Hit a new PR on Squats today! 🎉',
      content: '140kg for 5 reps clean. Progressive overload over the last 6 weeks really paid off.',
      likesCount: 12,
      commentsCount: 3,
      createdAt: '2 hours ago',
    },
    {
      id: 'post_2',
      username: 'priya_m',
      title: 'Completed Morning Calisthenics Routine',
      content: '5 rounds of pull-ups, dips, and core work done before breakfast.',
      likesCount: 8,
      commentsCount: 1,
      createdAt: '5 hours ago',
    },
  ]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleShareWorkout = async () => {
    if (!newPostTitle.trim()) {
      Alert.alert('Required', 'Please enter a title for your post.');
      return;
    }

    const newPost: ActivityPost = {
      id: `post_${Date.now()}`,
      username: 'You',
      title: newPostTitle,
      content: newPostContent,
      likesCount: 0,
      commentsCount: 0,
      createdAt: 'Just now',
    };

    setPosts([newPost, ...posts]);
    setNewPostTitle('');
    setNewPostContent('');
    setIsPosting(false);
    Alert.alert('Celebration Shared', 'Your workout post is now visible in your self-hosted community feed.');
  };

  const handleLike = (postId: string) => {
    setPosts(
      posts.map((p) =>
        p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p
      )
    );
  };

  return (
    <ScreenContainer>
      <Header
        title="Fitness Community"
        subtitle="Self-Hosted • Privacy-First • Zero Trackers"
      />

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'challenges' && styles.tabButtonActive]}
          onPress={() => setActiveTab('challenges')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'challenges' && styles.tabTextActive,
            ]}
          >
            Challenges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'feed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('feed')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'feed' && styles.tabTextActive,
            ]}
          >
            Celebration Feed
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'challenges' ? (
        <View>
          <Text style={styles.sectionHeader}>Active Fitness Challenges</Text>
          {challenges.map((c) => (
            <SurfaceCard key={c.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.challengeTitle}>{c.title}</Text>
                <Text style={styles.badge}>{c.participantsCount} Joined</Text>
              </View>
              <Text style={styles.challengeDesc}>{c.description}</Text>
              <Button
                title="Join Challenge"
                variant="outline"
                onPress={() => Alert.alert('Joined Challenge', `You are now competing in ${c.title}!`)}
                style={{ marginTop: theme.spacing.sm }}
              />
            </SurfaceCard>
          ))}
        </View>
      ) : (
        <View>
          {/* Create Post Prompt */}
          {!isPosting ? (
            <Button
              title="+ Share Workout Celebration"
              variant="primary"
              onPress={() => setIsPosting(true)}
              style={{ marginBottom: theme.spacing.md }}
            />
          ) : (
            <SurfaceCard style={{ marginBottom: theme.spacing.md }}>
              <Text style={styles.formTitle}>Share Achievement</Text>
              <TextInput
                style={styles.input}
                placeholder="Title (e.g., Hit 10k steps or Bench PR)"
                placeholderTextColor={theme.colors.textMuted}
                value={newPostTitle}
                onChangeText={setNewPostTitle}
              />
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Optional notes or reflection..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={newPostContent}
                onChangeText={setNewPostContent}
              />
              <View style={styles.rowBetween}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setIsPosting(false)}
                  style={{ flex: 1, marginRight: theme.spacing.sm }}
                />
                <Button
                  title="Post"
                  variant="primary"
                  onPress={handleShareWorkout}
                  style={{ flex: 1, marginLeft: theme.spacing.sm }}
                />
              </View>
            </SurfaceCard>
          )}

          <Text style={styles.sectionHeader}>Community Highlights</Text>
          {posts.map((p) => (
            <SurfaceCard key={p.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.username}>@{p.username}</Text>
                <Text style={styles.postTime}>{p.createdAt}</Text>
              </View>
              <Text style={styles.postTitle}>{p.title}</Text>
              {p.content ? <Text style={styles.postContent}>{p.content}</Text> : null}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleLike(p.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionText}>🔥 Kudos ({p.likesCount})</Text>
                </TouchableOpacity>
                <Text style={styles.actionText}>💬 {p.commentsCount} Comments</Text>
              </View>
            </SurfaceCard>
          ))}
        </View>
      )}

      <Button
        title="Back"
        variant="secondary"
        onPress={() => router.back()}
        style={{ marginTop: theme.spacing.lg }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  tabText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  sectionHeader: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  card: {
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  badge: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  challengeDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  formTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    ...theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
  username: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  postTime: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  postTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  postContent: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionBtn: {
    paddingVertical: 4,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
