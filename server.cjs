// Synapse API Server for Browser Extension
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001;

// 환경 변수 로드
require('dotenv').config();

// Supabase 클라이언트 설정
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 설정이 없습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:5173', 'chrome-extension://*'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Synapse API Server is running',
    timestamp: new Date().toISOString()
  });
});

// 브라우저 확장에서 콘텐츠 수집 요청
app.post('/api/extension/clip', async (req, res) => {
  try {
    console.log('📋 브라우저 확장 콘텐츠 수집 요청:', req.body.type);

    const { type, title, content, url, timestamp, metadata, tags } = req.body;

    // 입력 검증
    if (!title || !content) {
      return res.status(400).json({
        error: 'title과 content는 필수입니다'
      });
    }

    // 현재는 인증 없이 기본 사용자로 저장 (추후 개선 필요)
    // 임시로 첫 번째 사용자의 ID를 가져오기
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('사용자 조회 오류:', userError);
      return res.status(500).json({
        error: '사용자 정보를 찾을 수 없습니다'
      });
    }

    const userId = users[0].id;

    // 콘텐츠 타입에 따른 노드 타입 결정
    const nodeTypeMap = {
      'webpage': 'Resource',
      'text_selection': 'Knowledge',
      'quick_note': 'Note',
      'link': 'Resource'
    };

    const nodeType = nodeTypeMap[type] || 'Knowledge';

    // 태그 처리
    let processedTags = [];
    if (tags && Array.isArray(tags)) {
      processedTags = tags;
    } else if (typeof tags === 'string') {
      processedTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }

    // 자동 태그 추가
    if (type === 'webpage' && url) {
      const domain = new URL(url).hostname;
      processedTags.push(domain);
    }

    if (type === 'text_selection') {
      processedTags.push('발췌');
    }

    if (type === 'quick_note') {
      processedTags.push('메모');
    }

    processedTags.push('브라우저확장');

    // 지식 노드 생성
    const { data: node, error: nodeError } = await supabase
      .from('knowledge_nodes')
      .insert([{
        user_id: userId,
        title: title,
        content: content,
        node_type: nodeType,
        content_type: 'text',
        tags: processedTags,
        metadata: {
          ...metadata,
          source: 'browser_extension',
          original_url: url,
          clipped_at: timestamp,
          word_count: content.split(/\s+/).length
        }
      }])
      .select()
      .single();

    if (nodeError) {
      console.error('노드 생성 오류:', nodeError);
      return res.status(500).json({
        error: '노드 생성 중 오류가 발생했습니다',
        details: nodeError.message
      });
    }

    console.log('✅ 노드 생성 완료:', node.id);

    res.json({
      success: true,
      node: {
        id: node.id,
        title: node.title,
        type: node.node_type,
        created_at: node.created_at
      },
      message: '콘텐츠가 성공적으로 수집되었습니다'
    });

  } catch (error) {
    console.error('❌ 콘텐츠 수집 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다',
      details: error.message
    });
  }
});

// 브라우저 확장 통계 조회 (전체)
app.get('/api/extension/stats', async (req, res) => {
  try {
    const { data: nodes, count, error } = await supabase
      .from('knowledge_nodes')
      .select('id, created_at, metadata', { count: 'exact' })
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    // 브라우저 확장에서 수집된 노드만 필터링
    const extensionNodes = nodes?.filter(node =>
      node.metadata?.source === 'browser_extension'
    ) || [];

    res.json({
      total_nodes: count || 0,
      extension_nodes: extensionNodes.length,
      recent_clips: extensionNodes
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(node => ({
          id: node.id,
          created_at: node.created_at,
          type: node.metadata?.type || 'unknown'
        }))
    });

  } catch (error) {
    console.error('❌ 통계 조회 오류:', error);
    res.status(500).json({
      error: '통계 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

// 브라우저 확장 통계 조회 (사용자별)
app.get('/api/extension/stats/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const { data: nodes, count, error } = await supabase
      .from('knowledge_nodes')
      .select('id, created_at, metadata', { count: 'exact' })
      .eq('is_active', true)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // 브라우저 확장에서 수집된 노드만 필터링
    const extensionNodes = nodes?.filter(node =>
      node.metadata?.source === 'browser_extension'
    ) || [];

    res.json({
      total_nodes: count || 0,
      extension_nodes: extensionNodes.length,
      recent_clips: extensionNodes
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(node => ({
          id: node.id,
          created_at: node.created_at,
          type: node.metadata?.type || 'unknown'
        }))
    });

  } catch (error) {
    console.error('❌ 통계 조회 오류:', error);
    res.status(500).json({
      error: '통계 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`🚀 Synapse API Server가 http://localhost:${port}에서 실행 중입니다`);
  console.log(`📋 브라우저 확장 API: http://localhost:${port}/api/extension/clip`);
});

module.exports = app;