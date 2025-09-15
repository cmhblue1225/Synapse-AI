import { knowledgeService } from '../services/knowledge.service';

// 샘플 노드 데이터 정의
export const sampleNodes = [
  {
    title: "React 개발 가이드",
    content: `<h2>React 개발 완벽 가이드</h2>
<p>React는 사용자 인터페이스를 구축하기 위한 JavaScript 라이브러리입니다.</p>

<h3>주요 개념</h3>
<ul>
  <li><strong>컴포넌트</strong>: 재사용 가능한 UI 조각</li>
  <li><strong>JSX</strong>: JavaScript XML 문법</li>
  <li><strong>Props</strong>: 컴포넌트 간 데이터 전달</li>
  <li><strong>State</strong>: 컴포넌트의 상태 관리</li>
</ul>

<h3>Hooks</h3>
<p>React Hooks를 사용하면 함수형 컴포넌트에서도 상태와 생명주기 기능을 사용할 수 있습니다.</p>
<blockquote>
<p>useState, useEffect, useContext 등이 대표적인 Hook들입니다.</p>
</blockquote>`,
    node_type: "Note",
    tags: ["React", "JavaScript", "Frontend", "웹개발", "프레임워크"]
  },
  {
    title: "JavaScript ES6+ 문법",
    content: `<h2>JavaScript ES6+ 주요 문법</h2>
<p>ES6 이후 JavaScript에 추가된 현대적인 문법들을 정리했습니다.</p>

<h3>화살표 함수</h3>
<pre><code>const add = (a, b) => a + b;
const greet = name => \`안녕하세요, \${name}님!\`;</code></pre>

<h3>구조 분해 할당</h3>
<pre><code>const { name, age } = person;
const [first, second] = array;</code></pre>

<h3>템플릿 리터럴</h3>
<p>백틱(\`)을 사용하여 문자열 내에 변수를 삽입할 수 있습니다.</p>

<h3>모듈 시스템</h3>
<ul>
  <li><code>import</code>: 모듈 가져오기</li>
  <li><code>export</code>: 모듈 내보내기</li>
</ul>`,
    node_type: "Note",
    tags: ["JavaScript", "ES6", "문법", "모던JS", "프로그래밍"]
  },
  {
    title: "함수형 프로그래밍",
    content: `<h2>함수형 프로그래밍 개념</h2>
<p>함수형 프로그래밍은 함수를 일급 객체로 취급하는 프로그래밍 패러다임입니다.</p>

<h3>핵심 원칙</h3>
<ul>
  <li><strong>순수 함수</strong>: 동일한 입력에 대해 항상 동일한 출력</li>
  <li><strong>불변성</strong>: 데이터를 변경하지 않음</li>
  <li><strong>고차 함수</strong>: 함수를 매개변수로 받거나 반환</li>
</ul>

<h3>주요 메서드</h3>
<p><code>map</code>, <code>filter</code>, <code>reduce</code> 등을 활용한 데이터 처리</p>

<h3>장점</h3>
<blockquote>
<p>코드의 예측 가능성과 테스트 용이성이 높아집니다.</p>
</blockquote>`,
    node_type: "Concept",
    tags: ["함수형프로그래밍", "프로그래밍패러다임", "JavaScript", "순수함수"]
  },
  {
    title: "객체지향 프로그래밍",
    content: `<h2>객체지향 프로그래밍 (OOP)</h2>
<p>객체지향 프로그래밍은 현실 세계의 객체를 모델링하는 프로그래밍 패러다임입니다.</p>

<h3>4대 특징</h3>
<ul>
  <li><strong>캡슐화</strong>: 데이터와 메서드를 하나의 객체로 묶음</li>
  <li><strong>상속</strong>: 기존 클래스의 특성을 새 클래스가 물려받음</li>
  <li><strong>다형성</strong>: 같은 인터페이스로 다른 구현체 사용</li>
  <li><strong>추상화</strong>: 복잡한 구현을 숨기고 인터페이스만 노출</li>
</ul>

<h3>JavaScript에서의 OOP</h3>
<pre><code>class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  greet() {
    return \`안녕하세요, \${this.name}입니다.\`;
  }
}</code></pre>`,
    node_type: "Concept",
    tags: ["객체지향", "OOP", "프로그래밍패러다임", "클래스", "상속"]
  },
  {
    title: "유용한 개발 도구 모음",
    content: `<h2>개발자를 위한 필수 도구들</h2>
<p>효율적인 개발을 위한 도구들을 카테고리별로 정리했습니다.</p>

<h3>코드 에디터</h3>
<ul>
  <li><strong>VS Code</strong>: 가장 인기 있는 무료 에디터</li>
  <li><strong>WebStorm</strong>: JetBrains의 강력한 IDE</li>
</ul>

<h3>버전 관리</h3>
<ul>
  <li><strong>Git</strong>: 분산 버전 관리 시스템</li>
  <li><strong>GitHub</strong>: Git 호스팅 서비스</li>
</ul>

<h3>디자인 도구</h3>
<ul>
  <li><strong>Figma</strong>: 협업 디자인 툴</li>
  <li><strong>Sketch</strong>: Mac 전용 디자인 툴</li>
</ul>

<h3>API 테스트</h3>
<ul>
  <li><strong>Postman</strong>: API 개발 플랫폼</li>
  <li><strong>Insomnia</strong>: 간단한 REST 클라이언트</li>
</ul>`,
    node_type: "WebClip",
    tags: ["개발도구", "생산성", "도구", "개발환경", "추천"]
  },
  {
    title: "2024 프론트엔드 트렌드",
    content: `<h2>2024년 프론트엔드 개발 트렌드</h2>
<p>올해 주목받고 있는 프론트엔드 기술들과 트렌드를 정리했습니다.</p>

<h3>프레임워크 트렌드</h3>
<ul>
  <li><strong>Next.js 14</strong>: App Router와 Server Components</li>
  <li><strong>Astro</strong>: 정적 사이트 생성의 새로운 패러다임</li>
  <li><strong>SvelteKit</strong>: 간결한 문법과 높은 성능</li>
</ul>

<h3>스타일링</h3>
<ul>
  <li><strong>Tailwind CSS</strong>: 유틸리티 퍼스트 CSS</li>
  <li><strong>CSS-in-JS</strong>: Styled Components, Emotion</li>
</ul>

<h3>개발 도구</h3>
<ul>
  <li><strong>Vite</strong>: 빠른 빌드 도구</li>
  <li><strong>Bun</strong>: JavaScript 런타임 새로운 대안</li>
</ul>

<blockquote>
<p>성능과 개발자 경험(DX)이 핵심 키워드입니다.</p>
</blockquote>`,
    node_type: "WebClip",
    tags: ["프론트엔드", "트렌드", "2024", "기술동향", "웹개발"]
  },
  {
    title: "프로젝트 아키텍처 문서",
    content: `<h1>Synapse 프로젝트 아키텍처</h1>

<h2>시스템 개요</h2>
<p>Synapse는 지식 관리 시스템으로, 사용자의 지식을 구조화하고 연결하여 효과적인 학습과 정보 관리를 지원합니다.</p>

<h2>기술 스택</h2>
<h3>Frontend</h3>
<ul>
  <li>React 19 + TypeScript</li>
  <li>Vite (빌드 도구)</li>
  <li>TailwindCSS (스타일링)</li>
  <li>D3.js (그래프 시각화)</li>
</ul>

<h3>Backend</h3>
<ul>
  <li>Supabase (BaaS)</li>
  <li>PostgreSQL (데이터베이스)</li>
  <li>실시간 구독</li>
</ul>

<h2>주요 기능</h2>
<ol>
  <li>지식 노드 생성/관리</li>
  <li>노드 간 관계 정의</li>
  <li>그래프 시각화</li>
  <li>AI 기반 관계 발견</li>
  <li>백링크 패널</li>
</ol>`,
    node_type: "Document",
    tags: ["아키텍처", "문서", "프로젝트", "시스템설계", "기술명세"]
  },
  {
    title: "API 명세서 v1.0",
    content: `<h1>Synapse API 명세서</h1>

<h2>인증</h2>
<p>모든 API 요청은 JWT 토큰을 통한 인증이 필요합니다.</p>
<pre><code>Authorization: Bearer &lt;your-jwt-token&gt;</code></pre>

<h2>지식 노드 API</h2>

<h3>GET /api/knowledge/nodes</h3>
<p>사용자의 지식 노드 목록을 조회합니다.</p>
<pre><code>{
  "nodes": [
    {
      "id": "uuid",
      "title": "노드 제목",
      "content": "노드 내용",
      "node_type": "Note",
      "tags": ["tag1", "tag2"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10
}</code></pre>

<h3>POST /api/knowledge/nodes</h3>
<p>새 지식 노드를 생성합니다.</p>
<pre><code>{
  "title": "새 노드",
  "content": "노드 내용",
  "node_type": "Note",
  "tags": ["tag1"]
}</code></pre>

<h2>관계 API</h2>

<h3>POST /api/knowledge/relationships</h3>
<p>노드 간 관계를 생성합니다.</p>
<pre><code>{
  "source_node_id": "uuid1",
  "target_node_id": "uuid2",
  "relationship_type": "related_to",
  "comment": "관계 설명"
}</code></pre>`,
    node_type: "Document",
    tags: ["API", "명세서", "개발문서", "백엔드", "엔드포인트"]
  },
  {
    title: "시스템 아키텍처 다이어그램",
    content: `<h2>Synapse 시스템 아키텍처</h2>
<p>전체 시스템의 구조를 시각적으로 표현한 다이어그램입니다.</p>

<h3>계층 구조</h3>
<ul>
  <li><strong>프레젠테이션 계층</strong>: React Frontend</li>
  <li><strong>서비스 계층</strong>: Supabase Backend</li>
  <li><strong>데이터 계층</strong>: PostgreSQL Database</li>
</ul>

<h3>주요 컴포넌트</h3>
<ul>
  <li>사용자 인터페이스 (UI)</li>
  <li>상태 관리 (Zustand)</li>
  <li>API 서비스 계층</li>
  <li>데이터베이스 스키마</li>
  <li>그래프 시각화 엔진</li>
</ul>

<h3>데이터 플로우</h3>
<p>사용자 → UI → API → Database → 그래프 처리 → 시각화</p>

<blockquote>
<p>이미지 파일: system-architecture-diagram.png</p>
</blockquote>`,
    node_type: "Image",
    tags: ["아키텍처", "다이어그램", "시각화", "시스템설계", "문서"]
  },
  {
    title: "UI 디자인 시스템",
    content: `<h2>Synapse UI 디자인 시스템</h2>
<p>일관된 사용자 경험을 위한 디자인 가이드라인입니다.</p>

<h3>컬러 팔레트</h3>
<ul>
  <li><strong>Primary</strong>: #3B82F6 (Blue)</li>
  <li><strong>Secondary</strong>: #10B981 (Green)</li>
  <li><strong>Accent</strong>: #F59E0B (Yellow)</li>
  <li><strong>Neutral</strong>: #6B7280 (Gray)</li>
</ul>

<h3>타이포그래피</h3>
<ul>
  <li><strong>Heading</strong>: Inter Bold</li>
  <li><strong>Body</strong>: Inter Regular</li>
  <li><strong>Code</strong>: JetBrains Mono</li>
</ul>

<h3>컴포넌트</h3>
<ul>
  <li>버튼 (Primary, Secondary, Outline)</li>
  <li>입력 필드 (Text, Select, Textarea)</li>
  <li>카드 (Node Card, Info Card)</li>
  <li>네비게이션 (Sidebar, Header)</li>
</ul>

<h3>아이콘 시스템</h3>
<p>Heroicons을 기본으로 사용하며, 일관된 24x24 크기를 유지합니다.</p>`,
    node_type: "Image",
    tags: ["디자인", "UI", "디자인시스템", "스타일가이드", "컬러"]
  },
  {
    title: "Node.js 백엔드 개발",
    content: `<h2>Node.js 백엔드 개발 가이드</h2>
<p>Node.js를 사용한 서버 개발의 기본기부터 고급 기법까지 다룹니다.</p>

<h3>기본 설정</h3>
<pre><code>const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});</code></pre>

<h3>미들웨어</h3>
<ul>
  <li><strong>CORS</strong>: 크로스 오리진 요청 처리</li>
  <li><strong>Authentication</strong>: JWT 토큰 검증</li>
  <li><strong>Validation</strong>: 입력 데이터 검증</li>
  <li><strong>Error Handling</strong>: 에러 처리</li>
</ul>

<h3>데이터베이스 연동</h3>
<p>PostgreSQL, MongoDB 등 다양한 데이터베이스와의 연동 방법</p>

<h3>보안</h3>
<ul>
  <li>Helmet.js - HTTP 헤더 보안</li>
  <li>Rate Limiting - API 호출 제한</li>
  <li>Input Sanitization - 입력 데이터 정제</li>
</ul>`,
    node_type: "Note",
    tags: ["Node.js", "백엔드", "Express", "서버개발", "JavaScript"]
  },
  {
    title: "데이터베이스 설계 원칙",
    content: `<h2>데이터베이스 설계 원칙</h2>
<p>효율적이고 확장 가능한 데이터베이스를 설계하기 위한 핵심 원칙들입니다.</p>

<h3>정규화</h3>
<ul>
  <li><strong>1차 정규화</strong>: 원자값 저장</li>
  <li><strong>2차 정규화</strong>: 부분 함수 종속 제거</li>
  <li><strong>3차 정규화</strong>: 이행 함수 종속 제거</li>
</ul>

<h3>인덱스 전략</h3>
<ul>
  <li>Primary Index: 기본키 인덱스</li>
  <li>Secondary Index: 검색 성능 향상</li>
  <li>Composite Index: 복합 조건 최적화</li>
</ul>

<h3>관계 설정</h3>
<ul>
  <li><strong>1:1</strong> - 사용자와 프로필</li>
  <li><strong>1:N</strong> - 사용자와 노드</li>
  <li><strong>N:N</strong> - 노드 간 관계</li>
</ul>

<h3>성능 최적화</h3>
<blockquote>
<p>쿼리 최적화, 적절한 인덱스 설계, 파티셔닝을 통한 성능 향상</p>
</blockquote>`,
    node_type: "Concept",
    tags: ["데이터베이스", "설계", "정규화", "인덱스", "최적화"]
  }
];

// 노드 간 관계 정의
export const sampleRelationships = [
  {
    sourceTitle: "React 개발 가이드",
    targetTitle: "JavaScript ES6+ 문법",
    relationshipType: "related_to",
    comment: "React 개발에는 ES6+ 문법 이해가 필수적입니다.",
    weight: 0.8
  },
  {
    sourceTitle: "함수형 프로그래밍",
    targetTitle: "React 개발 가이드",
    relationshipType: "derives_from",
    comment: "React Hook은 함수형 프로그래밍 패러다임을 따릅니다.",
    weight: 0.9
  },
  {
    sourceTitle: "API 명세서 v1.0",
    targetTitle: "프로젝트 아키텍처 문서",
    relationshipType: "supports",
    comment: "API 명세서는 아키텍처 문서를 뒷받침합니다.",
    weight: 0.8
  },
  {
    sourceTitle: "객체지향 프로그래밍",
    targetTitle: "함수형 프로그래밍",
    relationshipType: "contradicts",
    comment: "두 패러다임은 서로 다른 접근 방식을 제시합니다.",
    weight: 0.9
  },
  {
    sourceTitle: "React 개발 가이드",
    targetTitle: "2024 프론트엔드 트렌드",
    relationshipType: "part_of",
    comment: "React는 현재 프론트엔드 트렌드의 한 부분입니다.",
    weight: 1.0
  },
  {
    sourceTitle: "유용한 개발 도구 모음",
    targetTitle: "Node.js 백엔드 개발",
    relationshipType: "supports",
    comment: "개발 도구들이 백엔드 개발을 지원합니다.",
    weight: 0.5
  },
  {
    sourceTitle: "시스템 아키텍처 다이어그램",
    targetTitle: "프로젝트 아키텍처 문서",
    relationshipType: "derives_from",
    comment: "다이어그램은 아키텍처 문서를 시각적으로 확장합니다.",
    weight: 0.8
  },
  {
    sourceTitle: "UI 디자인 시스템",
    targetTitle: "React 개발 가이드",
    relationshipType: "related_to",
    comment: "React 컴포넌트 개발에 디자인 시스템이 참조됩니다.",
    weight: 0.9
  },
  {
    sourceTitle: "데이터베이스 설계 원칙",
    targetTitle: "Node.js 백엔드 개발",
    relationshipType: "supports",
    comment: "DB 설계 원칙은 백엔드 개발의 기반이 됩니다.",
    weight: 0.7
  },
  {
    sourceTitle: "JavaScript ES6+ 문법",
    targetTitle: "함수형 프로그래밍",
    relationshipType: "supports",
    comment: "ES6+ 문법이 함수형 프로그래밍을 더 쉽게 만듭니다.",
    weight: 0.8
  },
  {
    sourceTitle: "2024 프론트엔드 트렌드",
    targetTitle: "유용한 개발 도구 모음",
    relationshipType: "related_to",
    comment: "최신 트렌드는 새로운 개발 도구들을 소개합니다.",
    weight: 0.9
  },
  {
    sourceTitle: "API 명세서 v1.0",
    targetTitle: "Node.js 백엔드 개발",
    relationshipType: "part_of",
    comment: "API 명세서는 백엔드 개발의 구체적인 산출물입니다.",
    weight: 0.9
  }
];

// 샘플 데이터 생성 함수
export class SampleDataGenerator {
  private createdNodes: Map<string, string> = new Map();

  async generateSampleNodes(): Promise<void> {
    console.log('📝 샘플 노드 생성 시작...');

    for (const [index, nodeData] of sampleNodes.entries()) {
      try {
        const result = await knowledgeService.createNode(nodeData);
        this.createdNodes.set(nodeData.title, result.id);
        console.log(`✅ ${index + 1}/12 노드 생성 완료: ${nodeData.title} (${result.id})`);

        // API 호출 간격 조절
        await this.delay(500);
      } catch (error) {
        console.error(`❌ 노드 생성 실패: ${nodeData.title}`, error);
      }
    }

    console.log(`🎉 총 ${this.createdNodes.size}개 노드 생성 완료!`);
  }

  async generateSampleRelationships(): Promise<void> {
    console.log('🔗 샘플 관계 생성 시작...');
    console.log('📋 생성된 노드 목록:', Array.from(this.createdNodes.entries()));

    let successCount = 0;

    // 생성된 노드 배열로 변환
    const nodeEntries = Array.from(this.createdNodes.entries());

    if (nodeEntries.length < 2) {
      console.warn('⚠️ 관계 생성을 위한 노드가 부족합니다.');
      return;
    }

    // 기본 관계들을 생성 (노드 인덱스 기반)
    // 유효한 relationship_type: 'related_to', 'depends_on', 'part_of', 'derives_from', 'contradicts', 'supports', 'example_of', 'generalizes', 'specializes', 'causes', 'enables'
    const basicRelationships = [
      { sourceIndex: 0, targetIndex: 1, type: 'related_to', comment: '첫 번째 노드가 두 번째 노드와 연관됩니다.' },
      { sourceIndex: 1, targetIndex: 2, type: 'derives_from', comment: '두 번째 노드가 세 번째 노드에서 파생됩니다.' },
      { sourceIndex: 2, targetIndex: 3, type: 'supports', comment: '세 번째 노드가 네 번째 노드를 지원합니다.' },
      { sourceIndex: 0, targetIndex: 3, type: 'depends_on', comment: '첫 번째 노드가 네 번째 노드에 의존합니다.' },
      { sourceIndex: 1, targetIndex: 4, type: 'enables', comment: '두 번째 노드가 다섯 번째 노드를 가능하게 합니다.' }
    ];

    for (const [index, relData] of basicRelationships.entries()) {
      if (relData.sourceIndex >= nodeEntries.length || relData.targetIndex >= nodeEntries.length) {
        console.warn(`⚠️ 인덱스 범위 초과: ${relData.sourceIndex} → ${relData.targetIndex}`);
        continue;
      }

      const [sourceTitle, sourceId] = nodeEntries[relData.sourceIndex];
      const [targetTitle, targetId] = nodeEntries[relData.targetIndex];

      try {
        await knowledgeService.createRelationship({
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          relationshipType: relData.type,
          comment: relData.comment,
          weight: Math.max(0.1, 1.0 - (index * 0.15))
        });

        successCount++;
        console.log(`✅ ${successCount}/5 관계 생성 완료: ${sourceTitle} → ${targetTitle} (${relData.type})`);

        // API 호출 간격 조절
        await this.delay(300);
      } catch (error) {
        console.error(`❌ 관계 생성 실패: ${sourceTitle} → ${targetTitle}`, error);
      }
    }

    console.log(`🎉 총 ${successCount}개 관계 생성 완료!`);
  }

  async generateAllSampleData(onProgress?: (progress: string) => void): Promise<void> {
    console.log('🚀 전체 샘플 데이터 생성 시작...');
    console.log('===================================');
    onProgress?.('🚀 전체 샘플 데이터 생성을 시작합니다...');

    onProgress?.('📝 샘플 노드를 생성하고 있습니다...');
    await this.generateSampleNodes();

    console.log('-----------------------------------');
    onProgress?.('🔗 노드 간 관계를 생성하고 있습니다...');
    await this.generateSampleRelationships();

    console.log('===================================');
    console.log('🎊 모든 샘플 데이터 생성 완료!');
    console.log(`📊 생성된 노드: ${this.createdNodes.size}개`);
    console.log(`🔗 생성된 관계: ${sampleRelationships.length}개 시도`);

    onProgress?.(`🎊 모든 샘플 데이터 생성 완료! 노드 ${this.createdNodes.size}개, 관계 ${sampleRelationships.length}개`);

    // 생성된 노드 ID 목록 출력
    console.log('\n📋 생성된 노드 목록:');
    Array.from(this.createdNodes.entries()).forEach(([title, id]) => {
      console.log(`  • ${title}: ${id}`);
    });
  }

  getCreatedNodes(): Map<string, string> {
    return this.createdNodes;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 테스트용 함수들
export const testFunctions = {
  // 기본 CRUD 테스트
  async testBasicCRUD() {
    console.log('🧪 기본 CRUD 테스트 시작...');

    try {
      // 노드 목록 조회
      const { nodes, totalNodes } = await knowledgeService.getUserNodes({ limit: 20 });
      console.log(`✅ 노드 조회 성공: ${nodes.length}개 노드, 총 ${totalNodes}개`);

      if (nodes.length > 0) {
        const firstNode = nodes[0];

        // 단일 노드 조회
        const nodeDetail = await knowledgeService.getNode(firstNode.id);
        console.log(`✅ 단일 노드 조회 성공: ${nodeDetail?.title}`);

        // 노드 관계 조회
        const relationships = await knowledgeService.getNodeRelationships(firstNode.id);
        console.log(`✅ 관계 조회 성공: ${relationships.length}개 관계`);
      }

    } catch (error) {
      console.error('❌ CRUD 테스트 실패:', error);
    }
  },

  // 그래프 데이터 테스트
  async testGraphData() {
    console.log('📊 그래프 데이터 테스트 시작...');

    try {
      const graphData = await knowledgeService.getGraphData();
      console.log(`✅ 그래프 데이터 조회 성공:`);
      console.log(`  • 노드: ${graphData.nodes.length}개`);
      console.log(`  • 관계: ${graphData.relationships.length}개`);

      // 노드 타입별 분포
      const nodeTypeCount = graphData.nodes.reduce((acc, node) => {
        acc[node.node_type] = (acc[node.node_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('  • 노드 타입별 분포:');
      Object.entries(nodeTypeCount).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}개`);
      });

      // 관계 타입별 분포
      const relationshipTypeCount = graphData.relationships.reduce((acc, rel) => {
        acc[rel.relationship_type] = (acc[rel.relationship_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('  • 관계 타입별 분포:');
      Object.entries(relationshipTypeCount).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}개`);
      });

    } catch (error) {
      console.error('❌ 그래프 데이터 테스트 실패:', error);
    }
  },

  // 검색 테스트
  async testSearch() {
    console.log('🔍 검색 기능 테스트 시작...');

    const searchQueries = ['React', 'JavaScript', '프로그래밍', '개발', '함수'];

    for (const query of searchQueries) {
      try {
        const results = await knowledgeService.searchNodes(query);
        console.log(`✅ "${query}" 검색 결과: ${results.length}개`);
      } catch (error) {
        console.error(`❌ "${query}" 검색 실패:`, error);
      }
    }
  },

  // 전체 테스트 실행
  async runAllTests() {
    console.log('🚀 전체 기능 테스트 시작...');
    console.log('===================================');

    await this.testBasicCRUD();
    console.log('-----------------------------------');
    await this.testGraphData();
    console.log('-----------------------------------');
    await this.testSearch();

    console.log('===================================');
    console.log('🎉 전체 테스트 완료!');
  }
};