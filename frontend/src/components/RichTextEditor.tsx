import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { useEffect } from 'react'

const COLORS = [
  { label: 'Preto',    value: '#000000' },
  { label: 'Cinza',    value: '#6b7280' },
  { label: 'Vermelho', value: '#dc2626' },
  { label: 'Laranja',  value: '#ea580c' },
  { label: 'Amarelo',  value: '#ca8a04' },
  { label: 'Verde',    value: '#16a34a' },
  { label: 'Azul',     value: '#2563eb' },
  { label: 'Roxo',     value: '#7c3aed' },
]

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder = 'Digite o enunciado...' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, blockquote: false, code: false, codeBlock: false,
        horizontalRule: false, listItem: false, bulletList: false, orderedList: false,
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.getHTML()
      // TipTap returns <p></p> for empty content — normalize to ''
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: { class: 'rich-editor-body focus:outline-none' },
    },
  })

  // Sync when value changes externally (form reset, edit load)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const normalized = current === '<p></p>' ? '' : current
    if (normalized !== (value || '')) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value])

  if (!editor) return null

  const Btn = ({ active, onClick, title, children }: {
    active: boolean; onClick: () => void; title: string; children: React.ReactNode
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`px-2 py-1 text-sm rounded transition-colors leading-none select-none ${
        active ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-[#e1e2ec]'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-[#c5c5d3] dark:border-[#464554] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-600 dark:focus-within:ring-slate-500 focus-within:border-transparent">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#e5e7eb] dark:border-[#464554] bg-gray-50 dark:bg-[#1d1f27] flex-wrap">
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito (Ctrl+B)">
          <b>N</b>
        </Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico (Ctrl+I)">
          <i>I</i>
        </Btn>
        <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado (Ctrl+U)">
          <u>S</u>
        </Btn>
        <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
          <s>T</s>
        </Btn>

        <div className="w-px h-5 bg-gray-200 dark:bg-[#464554] mx-1 shrink-0" />

        {/* Color palette */}
        <div className="flex items-center gap-1 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c.value).run() }}
              className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 transition-transform hover:scale-125 shrink-0"
              style={{ backgroundColor: c.value }}
            />
          ))}
          <button
            type="button"
            title="Remover cor"
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run() }}
            className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#191b23] flex items-center justify-center text-[10px] text-gray-400 dark:text-[#908fa0] hover:bg-gray-100 dark:hover:bg-slate-800 shrink-0 leading-none"
          >✕</button>
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-[#464554] mx-1 shrink-0" />

        <Btn active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpar formatação">
          <span className="text-xs">A̲×</span>
        </Btn>
      </div>

      {/* Editor */}
      <div className="relative px-3 py-2 min-h-[96px] bg-white dark:bg-[#191b23]">
        {editor.isEmpty && (
          <p className="absolute top-2 left-3 text-sm text-gray-400 dark:text-[#908fa0] pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
