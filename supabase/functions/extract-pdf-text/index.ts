// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import pdf from "npm:pdf-parse@1.1.1"

console.log("PDF Text Extraction Function initialized!")

Deno.serve(async (req) => {
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { fileData, fileName } = await req.json()

    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'No file data provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`📄 PDF 텍스트 추출 시작: ${fileName}`)

    // Base64 데이터를 ArrayBuffer로 변환
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))
    const buffer = binaryData.buffer

    // PDF 파싱 실행
    const data = await pdf(buffer)

    const extractedText = data.text || ''
    const pageCount = data.numpages || 0

    console.log(`✅ PDF 텍스트 추출 완료: ${extractedText.length}자, ${pageCount}페이지`)

    // 텍스트가 너무 길면 자르기 (15만자 제한)
    let finalText = extractedText
    if (finalText.length > 150000) {
      finalText = finalText.substring(0, 150000)
      finalText += '\n\n[📋 텍스트가 너무 길어 일부만 포함됩니다]'
    }

    return new Response(
      JSON.stringify({
        text: finalText,
        pageCount: pageCount,
        characterCount: extractedText.length,
        fileName: fileName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ PDF 텍스트 추출 오류:', error)

    return new Response(
      JSON.stringify({
        error: 'PDF text extraction failed',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/extract-pdf-text' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
