'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { lowlight } from 'lowlight';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  ImageIcon,
  Link as LinkIcon,
  Eye,
  FileCode,
} from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({
  content,
  onChange,
  placeholder = 'Start writing your article...',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'wysiwyg' | 'source'>('wysiwyg');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] max-w-none p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Get markdown from editor
      const markdown = editor.getText(); // TODO: Convert to markdown properly
      onChange(markdown);
    },
  });

  const toggleMode = () => {
    setMode(mode === 'wysiwyg' ? 'source' : 'wysiwyg');
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('Enter link URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b bg-muted/40 p-2 flex flex-wrap gap-1">
        {/* Mode Toggle */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={toggleMode}
          className="mr-2"
        >
          {mode === 'wysiwyg' ? (
            <>
              <FileCode className="h-4 w-4 mr-1" />
              Source
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Visual
            </>
          )}
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {mode === 'wysiwyg' && (
          <>
            {/* Headings */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
            >
              <Heading2 className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Text formatting */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-accent' : ''}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-accent' : ''}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={editor.isActive('code') ? 'bg-accent' : ''}
            >
              <Code className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Lists */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-accent' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-accent' : ''}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'bg-accent' : ''}
            >
              <Quote className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Media */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={addImage}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={addLink}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div className="bg-background">
        {mode === 'wysiwyg' ? (
          <EditorContent editor={editor} />
        ) : (
          <Textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[400px] font-mono text-sm resize-none border-0 focus-visible:ring-0"
          />
        )}
      </div>

      {/* Platform Markup Helper */}
      <div className="border-t bg-muted/20 p-2 text-xs text-muted-foreground">
        <p>
          <strong>Tip:</strong> Use{' '}
          <code className="bg-muted px-1 py-0.5 rounded">
            [[platforms: dev.to, medium]]
          </code>{' '}
          to mark platform-specific content
        </p>
      </div>
    </div>
  );
}
