import { supabase } from '../lib/supabase';

export interface StudySession {
  id: string;
  user_id: string;
  session_type: 'memory_notes' | 'flashcards' | 'quiz' | 'summary' | 'concept_map' | 'ai_feedback';
  title: string;
  description?: string;
  node_ids: string[];
  session_data: Record<string, any>;
  progress: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  session_id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags: string[];
  review_count: number;
  correct_count: number;
  last_reviewed_at?: string;
  next_review_at?: string;
  ease_factor: number;
  interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  session_id: string;
  question: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options?: string[];
  correct_answer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface QuizResult {
  id: string;
  session_id: string;
  question_id: string;
  user_answer?: string;
  is_correct: boolean;
  time_taken?: number;
  points_earned: number;
  created_at: string;
}

export interface StudyProgress {
  id: string;
  user_id: string;
  node_id: string;
  activity_type: string;
  mastery_level: number;
  total_sessions: number;
  last_studied_at: string;
  streak_days: number;
  created_at: string;
  updated_at: string;
}

export interface Mnemonic {
  id: string;
  session_id: string;
  concept: string;
  technique: string;
  memory_aid: string;
  effectiveness_rating?: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

class StudyService {
  // 학습 세션 관리
  async createStudySession(sessionData: Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<StudySession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        ...sessionData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getStudySessions(sessionType?: string): Promise<StudySession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sessionType) {
      query = query.eq('session_type', sessionType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getStudySession(sessionId: string): Promise<StudySession> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateStudySession(sessionId: string, updates: Partial<StudySession>): Promise<StudySession> {
    const { data, error } = await supabase
      .from('study_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteStudySession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  // 플래시카드 관리
  async createFlashcards(flashcards: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>[]): Promise<Flashcard[]> {
    const { data, error } = await supabase
      .from('flashcards')
      .insert(flashcards)
      .select();

    if (error) throw error;
    return data || [];
  }

  async getFlashcards(sessionId: string): Promise<Flashcard[]> {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getFlashcardsForReview(limit: number = 20): Promise<Flashcard[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('flashcards')
      .select(`
        *,
        study_sessions!inner(user_id)
      `)
      .eq('study_sessions.user_id', user.id)
      .or(`next_review_at.is.null,next_review_at.lte.${now}`)
      .order('next_review_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async updateFlashcard(flashcardId: string, updates: Partial<Flashcard>): Promise<Flashcard> {
    const { data, error } = await supabase
      .from('flashcards')
      .update(updates)
      .eq('id', flashcardId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Spaced Repetition 알고리즘
  async reviewFlashcard(flashcardId: string, quality: number): Promise<Flashcard> {
    const flashcard = await this.getFlashcard(flashcardId);
    if (!flashcard) throw new Error('Flashcard not found');

    // SM-2 알고리즘 구현
    let { ease_factor, interval_days, review_count, correct_count } = flashcard;
    const wasCorrect = quality >= 3;

    review_count++;
    if (wasCorrect) correct_count++;

    if (quality >= 3) {
      if (review_count === 1) {
        interval_days = 1;
      } else if (review_count === 2) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
    } else {
      interval_days = 1;
    }

    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease_factor < 1.3) ease_factor = 1.3;

    const next_review_at = new Date();
    next_review_at.setDate(next_review_at.getDate() + interval_days);

    return this.updateFlashcard(flashcardId, {
      review_count,
      correct_count,
      ease_factor,
      interval_days,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: next_review_at.toISOString(),
    });
  }

  async getFlashcard(flashcardId: string): Promise<Flashcard> {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', flashcardId)
      .single();

    if (error) throw error;
    return data;
  }

  // 퀴즈 질문 관리
  async createQuizQuestions(questions: Omit<QuizQuestion, 'id' | 'created_at' | 'updated_at'>[]): Promise<QuizQuestion[]> {
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(questions)
      .select();

    if (error) throw error;
    return data || [];
  }

  async getQuizQuestions(sessionId: string): Promise<QuizQuestion[]> {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateQuizQuestion(questionId: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const { data, error } = await supabase
      .from('quiz_questions')
      .update(updates)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 퀴즈 결과 관리
  async createQuizResults(results: Omit<QuizResult, 'id' | 'created_at'>[]): Promise<QuizResult[]> {
    const { data, error } = await supabase
      .from('quiz_results')
      .insert(results)
      .select();

    if (error) throw error;
    return data || [];
  }

  async getQuizResults(sessionId: string): Promise<QuizResult[]> {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // 학습 진행률 관리
  async updateStudyProgress(nodeId: string, activityType: string, progressData: Partial<StudyProgress>): Promise<StudyProgress> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('study_progress')
      .upsert({
        user_id: user.id,
        node_id: nodeId,
        activity_type: activityType,
        ...progressData,
        last_studied_at: new Date().toISOString(),
      }, { onConflict: 'user_id,node_id,activity_type' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getStudyProgress(nodeId?: string, activityType?: string): Promise<StudyProgress[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('study_progress')
      .select('*')
      .eq('user_id', user.id);

    if (nodeId) query = query.eq('node_id', nodeId);
    if (activityType) query = query.eq('activity_type', activityType);

    const { data, error } = await query.order('last_studied_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 암기법 관리
  async createMnemonics(mnemonics: Omit<Mnemonic, 'id' | 'created_at' | 'updated_at'>[]): Promise<Mnemonic[]> {
    const { data, error } = await supabase
      .from('mnemonics')
      .insert(mnemonics)
      .select();

    if (error) throw error;
    return data || [];
  }

  async getMnemonics(sessionId: string): Promise<Mnemonic[]> {
    const { data, error } = await supabase
      .from('mnemonics')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateMnemonicRating(mnemonicId: string, rating: number): Promise<Mnemonic> {
    const { data, error } = await supabase
      .from('mnemonics')
      .update({
        effectiveness_rating: rating,
        usage_count: supabase.sql`usage_count + 1`
      })
      .eq('id', mnemonicId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 통계 및 분석
  async getUserStudyStats(): Promise<{
    total_sessions: number;
    total_flashcards: number;
    total_reviews: number;
    average_accuracy: number;
    current_streak: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 여러 쿼리를 병렬로 실행
    const [sessionsResult, flashcardsResult, progressResult] = await Promise.all([
      supabase.from('study_sessions').select('id').eq('user_id', user.id),
      supabase
        .from('flashcards')
        .select('review_count, correct_count, study_sessions!inner(user_id)')
        .eq('study_sessions.user_id', user.id),
      supabase.from('study_progress').select('streak_days').eq('user_id', user.id).order('streak_days', { ascending: false }).limit(1)
    ]);

    const totalSessions = sessionsResult.data?.length || 0;
    const flashcardsData = flashcardsResult.data || [];
    const totalReviews = flashcardsData.reduce((sum, card) => sum + card.review_count, 0);
    const totalCorrect = flashcardsData.reduce((sum, card) => sum + card.correct_count, 0);
    const averageAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;
    const currentStreak = progressResult.data?.[0]?.streak_days || 0;

    return {
      total_sessions: totalSessions,
      total_flashcards: flashcardsData.length,
      total_reviews: totalReviews,
      average_accuracy: Math.round(averageAccuracy * 100) / 100,
      current_streak: currentStreak,
    };
  }
}

export const studyService = new StudyService();