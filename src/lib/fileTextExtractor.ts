// 다양한 파일 형식에서 텍스트 추출하는 유틸리티

// PDF 텍스트 추출을 위한 간단한 방법 (외부 라이브러리 없이)

interface ExtractedText {
  text: string;
  wordCount: number;
  extractedFrom: string;
}

export class FileTextExtractor {

  // 파일에서 텍스트 추출 (메인 함수)
  static async extractTextFromFile(file: File): Promise<ExtractedText> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    console.log(`📄 텍스트 추출 시작: ${file.name} (${fileType})`);

    try {
      // 파일 타입별 처리
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await this.extractFromPdfFile(file);
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await this.extractFromTextFile(file);
      } else if (fileType === 'text/markdown' || fileName.endsWith('.md')) {
        return await this.extractFromMarkdownFile(file);
      } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
        return await this.extractFromJsonFile(file);
      } else if (fileName.endsWith('.csv')) {
        return await this.extractFromCsvFile(file);
      } else if (fileType.startsWith('text/')) {
        // 기타 텍스트 파일들
        return await this.extractFromTextFile(file);
      }

      // 지원하지 않는 파일 타입
      return {
        text: `[${file.name} - ${fileType} 파일]`,
        wordCount: 0,
        extractedFrom: '지원하지 않는 형식'
      };

    } catch (error) {
      console.error(`텍스트 추출 실패: ${file.name}`, error);
      return {
        text: `[${file.name} - 추출 실패]`,
        wordCount: 0,
        extractedFrom: '추출 실패'
      };
    }
  }

  // 일반 텍스트 파일
  private static async extractFromTextFile(file: File): Promise<ExtractedText> {
    const text = await this.readFileAsText(file);
    return {
      text: text.trim(),
      wordCount: this.countWords(text),
      extractedFrom: 'TEXT'
    };
  }

  // 마크다운 파일
  private static async extractFromMarkdownFile(file: File): Promise<ExtractedText> {
    const text = await this.readFileAsText(file);
    // 마크다운 문법 제거 (간단한 정리)
    const cleanText = text
      .replace(/#{1,6}\s/g, '') // 헤더 제거
      .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
      .replace(/\*(.*?)\*/g, '$1') // 이탤릭 제거
      .replace(/`(.*?)`/g, '$1') // 인라인 코드 제거
      .replace(/```[\s\S]*?```/g, '[코드 블록]') // 코드 블록 제거
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 텍스트만 유지
      .trim();

    return {
      text: cleanText,
      wordCount: this.countWords(cleanText),
      extractedFrom: 'MARKDOWN'
    };
  }

  // JSON 파일
  private static async extractFromJsonFile(file: File): Promise<ExtractedText> {
    const text = await this.readFileAsText(file);
    try {
      const json = JSON.parse(text);
      const extractedText = this.extractTextFromObject(json);
      return {
        text: extractedText,
        wordCount: this.countWords(extractedText),
        extractedFrom: 'JSON'
      };
    } catch (error) {
      return {
        text: `[JSON 파일 - 파싱 오류: ${file.name}]`,
        wordCount: 0,
        extractedFrom: 'JSON_ERROR'
      };
    }
  }

  // CSV 파일 (간단한 처리)
  private static async extractFromCsvFile(file: File): Promise<ExtractedText> {
    const text = await this.readFileAsText(file);
    const lines = text.split('\n').slice(0, 100); // 처음 100줄만
    const extractedText = lines
      .map(line => line.replace(/,/g, ' ')) // 쉼표를 공백으로
      .join('\n');

    return {
      text: extractedText,
      wordCount: this.countWords(extractedText),
      extractedFrom: 'CSV'
    };
  }

  // PDF 파일 텍스트 추출 (Supabase Edge Function 활용)
  private static async extractFromPdfFile(file: File): Promise<ExtractedText> {
    try {
      console.log(`📕 PDF 텍스트 추출 시작: ${file.name} (${Math.round(file.size/1024)}KB)`);

      // 파일을 Base64로 변환
      const base64Data = await this.fileToBase64(file);

      // Supabase Edge Function을 호출하여 PDF 텍스트 추출
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/extract-pdf-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name
        })
      });

      if (response.ok) {
        const result = await response.json();
        const extractedText = result.text || '';
        const pageCount = result.pageCount || 0;

        // 파일명에서 키워드 추출하여 추가
        const fileName = file.name.replace('.pdf', '');
        const keywords = this.extractKeywordsFromFilename(fileName);

        let finalText = `PDF 문서: ${fileName}`;
        if (keywords.length > 0) {
          finalText += `\n키워드: ${keywords.join(', ')}`;
        }
        if (extractedText && extractedText.trim().length > 0) {
          finalText += `\n\n${extractedText}`;
          console.log(`✅ PDF 텍스트 추출 완료: ${extractedText.length}자, ${pageCount}페이지`);
        } else {
          console.warn(`⚠️ PDF에서 추출된 텍스트가 없습니다: ${fileName}`);
          finalText += `\n\n⚠️ 이 PDF 파일에서는 텍스트를 추출할 수 없었습니다. (스캔된 이미지 PDF일 가능성)`;
        }

        const wordCount = this.countWords(finalText);

        return {
          text: finalText.trim(),
          wordCount: wordCount,
          extractedFrom: `PDF (${pageCount}페이지, 서버 처리)`
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`PDF 추출 API 오류 (${response.status}): ${errorData.error || errorData.details || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('❌ PDF 텍스트 추출 실패:', error);

      // 실패 시 최소한 파일명이라도 포함
      const fileName = file.name.replace('.pdf', '');
      const keywords = this.extractKeywordsFromFilename(fileName);
      const fallbackText = `PDF 문서: ${fileName}${keywords.length > 0 ? `\n키워드: ${keywords.join(', ')}` : ''}\n\n⚠️ PDF 텍스트 자동 추출에 실패했지만 파일명과 키워드는 검색에 포함됩니다.\n\n[참고: PDF 내용을 검색에 포함하려면 텍스트를 직접 입력하거나 파일을 텍스트 형식으로 변환하여 업로드해주세요.]`;

      return {
        text: fallbackText,
        wordCount: this.countWords(fallbackText),
        extractedFrom: 'PDF 오류'
      };
    }
  }

  // 파일을 Base64로 변환하는 헬퍼 함수
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:application/pdf;base64, 부분을 제거하고 순수 base64만 반환
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ArrayBuffer로 파일 읽기
  private static readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  // 파일명에서 키워드 추출
  private static extractKeywordsFromFilename(filename: string): string[] {
    const tokens = filename
      .replace(/[_-]/g, ' ')
      .replace(/\d+/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1)
      .map(token => token.trim())
      .filter(token => token.length > 0);

    return [...new Set(tokens)].slice(0, 8);
  }

  // 파일을 텍스트로 읽기
  private static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  }


  // 객체에서 텍스트 추출 (재귀)
  private static extractTextFromObject(obj: any, depth = 0): string {
    if (depth > 5) return ''; // 깊이 제한

    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number') return obj.toString();
    if (typeof obj === 'boolean') return obj.toString();
    if (obj === null || obj === undefined) return '';

    if (Array.isArray(obj)) {
      return obj.map(item => this.extractTextFromObject(item, depth + 1)).join(' ');
    }

    if (typeof obj === 'object') {
      return Object.values(obj)
        .map(value => this.extractTextFromObject(value, depth + 1))
        .join(' ');
    }

    return '';
  }

  // 단어 수 계산 (한글/영어 구분)
  private static countWords(text: string): number {
    if (!text.trim()) return 0;

    // 한글 문자 수 + 영어 단어 수
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

    return koreanChars + englishWords;
  }

  // 여러 파일에서 텍스트 추출
  static async extractTextFromFiles(files: File[]): Promise<string> {
    if (!files || files.length === 0) return '';

    const extractions = await Promise.all(
      files.map(file => this.extractTextFromFile(file))
    );

    const combinedTexts = extractions
      .filter(extraction => extraction.wordCount > 0) // 빈 텍스트 제외
      .map(extraction => {
        return `[첨부파일: ${extraction.extractedFrom}]\n${extraction.text}`;
      })
      .join('\n\n---\n\n');

    const totalWords = extractions.reduce((sum, ext) => sum + ext.wordCount, 0);

    if (totalWords > 0) {
      console.log(`📄 총 ${files.length}개 파일에서 ${totalWords}개 단어 추출 완료`);
    }

    return combinedTexts;
  }
}