-- 학습 활동 관련 테이블 생성 마이그레이션
-- 파일명: study_activities_migration.sql
-- 생성일: 2025-09-15

-- 학습 활동 세션 테이블
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL, -- 'memory_notes', 'flashcards', 'quiz', 'summary', 'concept_map', 'ai_feedback'
    title TEXT NOT NULL,
    description TEXT,
    node_ids UUID[] NOT NULL, -- 참여한 지식 노드 ID들
    session_data JSONB DEFAULT '{}', -- 세션별 구체적인 데이터
    progress INTEGER DEFAULT 0, -- 0-100 진행률
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 플래시카드 테이블
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    category TEXT,
    tags TEXT[],
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    ease_factor DECIMAL DEFAULT 2.5, -- Spaced repetition algorithm
    interval_days INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 퀴즈 결과 테이블
CREATE TABLE quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    user_answer TEXT,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    time_taken INTEGER, -- seconds
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 학습 진행률 추적 테이블
CREATE TABLE study_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 학습 활동 타입
    mastery_level INTEGER DEFAULT 0, -- 0-100 숙련도
    total_sessions INTEGER DEFAULT 0,
    last_studied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    streak_days INTEGER DEFAULT 0, -- 연속 학습 일수
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, node_id, activity_type)
);

-- 암기법(Mnemonics) 테이블
CREATE TABLE mnemonics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    technique TEXT NOT NULL, -- 'acronym', 'visualization', 'story', 'rhyme', etc.
    memory_aid TEXT NOT NULL,
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mnemonics ENABLE ROW LEVEL SECURITY;

-- study_sessions 정책
CREATE POLICY "Users can manage own study sessions" ON study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- flashcards 정책
CREATE POLICY "Users can manage own flashcards" ON flashcards
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM study_sessions WHERE id = flashcards.session_id
        )
    );

-- quiz_results 정책
CREATE POLICY "Users can manage own quiz results" ON quiz_results
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM study_sessions WHERE id = quiz_results.session_id
        )
    );

-- study_progress 정책
CREATE POLICY "Users can manage own study progress" ON study_progress
    FOR ALL USING (auth.uid() = user_id);

-- mnemonics 정책
CREATE POLICY "Users can manage own mnemonics" ON mnemonics
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM study_sessions WHERE id = mnemonics.session_id
        )
    );

-- 인덱스 생성
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_type ON study_sessions(session_type);
CREATE INDEX idx_flashcards_session_id ON flashcards(session_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review_at);
CREATE INDEX idx_quiz_results_session_id ON quiz_results(session_id);
CREATE INDEX idx_study_progress_user_node ON study_progress(user_id, node_id);
CREATE INDEX idx_mnemonics_session_id ON mnemonics(session_id);

-- 트리거 함수: updated_at 자동 업데이트 (이미 존재하지 않는 경우만)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_study_progress_updated_at BEFORE UPDATE ON study_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mnemonics_updated_at BEFORE UPDATE ON mnemonics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 (개발용)
-- INSERT INTO study_sessions (user_id, session_type, title, description, node_ids) VALUES
--   ('auth_user_id', 'memory_notes', '첫 암기 노트 세션', 'AI가 생성한 암기 노트입니다.', ARRAY['node_id_1']);

COMMENT ON TABLE study_sessions IS '사용자의 학습 활동 세션 정보를 저장하는 테이블';
COMMENT ON TABLE flashcards IS 'Spaced repetition 알고리즘을 사용하는 플래시카드 데이터';
COMMENT ON TABLE quiz_results IS '퀴즈 결과와 성과를 추적하는 테이블';
COMMENT ON TABLE study_progress IS '사용자의 학습 진행률과 숙련도를 추적하는 테이블';
COMMENT ON TABLE mnemonics IS 'AI가 생성한 암기법과 효과성을 추적하는 테이블';