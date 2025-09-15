import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListBulletIcon,
  NumberedListIcon,
  CodeBracketIcon,
  QuestionMarkCircleIcon,
  LinkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content = '',
  onChange,
  placeholder = '내용을 입력하세요...',
  className = ''
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 ${className}`,
      },
    },
  })

  // content prop이 변경될 때 에디터 내용 업데이트
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content, false)
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run()
  const toggleItalic = () => editor.chain().focus().toggleItalic().run()
  const toggleStrike = () => editor.chain().focus().toggleStrike().run()
  const toggleCode = () => editor.chain().focus().toggleCode().run()
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run()
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run()
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run()

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL을 입력하세요', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addImage = () => {
    const url = window.prompt('이미지 URL을 입력하세요')

    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-2">
        <div className="flex items-center space-x-1 flex-wrap gap-y-1">
          {/* Text Formatting */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2">
            <ToolbarButton
              onClick={toggleBold}
              active={editor.isActive('bold')}
              title="굵게 (Ctrl+B)"
            >
              <BoldIcon className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={toggleItalic}
              active={editor.isActive('italic')}
              title="기울임꼴 (Ctrl+I)"
            >
              <ItalicIcon className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={toggleStrike}
              active={editor.isActive('strike')}
              title="취소선"
            >
              <StrikethroughIcon className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={toggleCode}
              active={editor.isActive('code')}
              title="인라인 코드"
            >
              <CodeBracketIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2">
            <ToolbarButton
              onClick={toggleBulletList}
              active={editor.isActive('bulletList')}
              title="글머리 기호"
            >
              <ListBulletIcon className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={toggleOrderedList}
              active={editor.isActive('orderedList')}
              title="번호 목록"
            >
              <NumberedListIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Block Elements */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2">
            <ToolbarButton
              onClick={toggleBlockquote}
              active={editor.isActive('blockquote')}
              title="인용구"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Media */}
          <div className="flex items-center space-x-1">
            <ToolbarButton
              onClick={setLink}
              active={editor.isActive('link')}
              title="링크"
            >
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={addImage}
              active={false}
              title="이미지"
            >
              <PhotoIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center space-x-1 ml-auto">
            <select
              onChange={(e) => {
                const level = parseInt(e.target.value)
                if (level === 0) {
                  editor.chain().focus().setParagraph().run()
                } else {
                  editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
                }
              }}
              value={
                editor.isActive('heading', { level: 1 }) ? 1 :
                editor.isActive('heading', { level: 2 }) ? 2 :
                editor.isActive('heading', { level: 3 }) ? 3 : 0
              }
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value={0}>본문</option>
              <option value={1}>제목 1</option>
              <option value={2}>제목 2</option>
              <option value={3}>제목 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-white">
        <EditorContent
          editor={editor}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}