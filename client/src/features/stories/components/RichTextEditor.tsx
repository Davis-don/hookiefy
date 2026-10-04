// src/components/RichTextEditor.jsx

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';

import './richtexteditor.css';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
};

/* ──────────────────────────────────────────────────────────
   Icons (inline SVG, 20×20, stroke-based)
   ────────────────────────────────────────────────────────── */
const IconBold = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
);

const IconItalic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const IconStrike = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4H9a3 3 0 0 0-2.83 4" />
    <path d="M14 12a4 4 0 0 1 0 8H6" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

const IconBulletList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </svg>
);

const IconOrderedList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </svg>
);

const IconQuote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c3-2 5-5 5-9V5H3v7h3c0 3-1 5-3 7z" />
    <path d="M13 21c3-2 5-5 5-9V5h-5v7h3c0 3-1 5-3 7z" />
  </svg>
);

const IconCode = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const IconLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconUndo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
  </svg>
);

const IconRedo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
  </svg>
);

const IconClear = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
  </svg>
);

const IconAa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18L10 6l6 12" />
    <path d="M6 14h8" />
    <circle cx="19" cy="10" r="3" />
    <path d="M19 13v5" />
  </svg>
);

const IconDone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 12 10 18 20 6" />
  </svg>
);

/* ──────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────── */
function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  maxLength = 5000,
  disabled = false,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,              // ← FIX: StarterKit already includes Link
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  /* Keep editor in sync if parent resets `value` */
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  /* Toggle editable */
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  /* Lock body scroll while sheet is open */
  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sheetOpen]);

  /* Close sheet on Escape (desktop) */
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const run = useCallback(
    (fn: () => void) => {
      if (!editor) return;
      fn();
    },
    [editor]
  );

  const promptLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) return null;

  const characters = editor.storage.characterCount.characters();
  const nearLimit = characters > maxLength * 0.8;

  const isActive = {
    bold:      editor.isActive('bold'),
    italic:    editor.isActive('italic'),
    strike:    editor.isActive('strike'),
    h1:        editor.isActive('heading', { level: 1 }),
    h2:        editor.isActive('heading', { level: 2 }),
    h3:        editor.isActive('heading', { level: 3 }),
    bullet:    editor.isActive('bulletList'),
    ordered:   editor.isActive('orderedList'),
    quote:     editor.isActive('blockquote'),
    code:      editor.isActive('codeBlock'),
    link:      editor.isActive('link'),
  };

  return (
    <div className={'rte' + (disabled ? ' is-disabled' : '')}>
      {/* ── Compact sticky toolbar ─────────────── */}
      <div className="rte-bar">
        <button
          type="button"
          className={'rte-iconbtn' + (isActive.bold ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(() => editor.chain().focus().toggleBold().run())}
          aria-label="Bold"
          aria-pressed={isActive.bold}
          disabled={disabled}
        >
          <IconBold />
        </button>

        <button
          type="button"
          className={'rte-iconbtn' + (isActive.italic ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
          aria-label="Italic"
          aria-pressed={isActive.italic}
          disabled={disabled}
        >
          <IconItalic />
        </button>

        <button
          type="button"
          className={'rte-iconbtn' + (isActive.bullet ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
          aria-label="Bullet list"
          aria-pressed={isActive.bullet}
          disabled={disabled}
        >
          <IconBulletList />
        </button>

        <button
          type="button"
          className={'rte-iconbtn' + (isActive.link ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={promptLink}
          aria-label="Link"
          aria-pressed={isActive.link}
          disabled={disabled}
        >
          <IconLink />
        </button>

        <span className="rte-bar-spacer" />

        {/* More / open sheet */}
        <button
          type="button"
          className="rte-iconbtn rte-iconbtn--accent"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setSheetOpen(true)}
          aria-label="More formatting"
          disabled={disabled}
        >
          <IconAa />
        </button>
      </div>

      {/* ── Editable area ──────────────────────── */}
      <EditorContent editor={editor} className="rte-content" />

      {/* ── Counter (only near limit) ──────────── */}
      {nearLimit && (
        <div
          className={
            'rte-counter' + (characters >= maxLength ? ' is-over' : '')
          }
        >
          {characters} / {maxLength}
        </div>
      )}

      {/* ── Bottom sheet (portal) ──────────────── */}
      {sheetOpen &&
        createPortal(
          <div
            className="rte-sheet-backdrop"
            onClick={() => setSheetOpen(false)}
            role="presentation"
          >
            <div
              className="rte-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Text formatting"
            >
              <div className="rte-sheet-handle" aria-hidden="true" />

              <div className="rte-sheet-header">
                <span>Formatting</span>
                <button
                  type="button"
                  className="rte-sheet-close"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                >
                  <IconDone />
                </button>
              </div>

              <div className="rte-sheet-body">
                {/* Text style */}
                <p className="rte-sheet-label">Text style</p>
                <div className="rte-sheet-grid">
                  <SheetBtn
                    active={isActive.bold}
                    onClick={() => run(() => editor.chain().focus().toggleBold().run())}
                    icon={<IconBold />}
                    label="Bold"
                  />
                  <SheetBtn
                    active={isActive.italic}
                    onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
                    icon={<IconItalic />}
                    label="Italic"
                  />
                  <SheetBtn
                    active={isActive.strike}
                    onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
                    icon={<IconStrike />}
                    label="Strike"
                  />
                  <SheetBtn
                    active={isActive.code}
                    onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}
                    icon={<IconCode />}
                    label="Code"
                  />
                </div>

                {/* Headings */}
                <p className="rte-sheet-label">Heading</p>
                <div className="rte-sheet-grid">
                  <SheetBtn
                    active={!isActive.h1 && !isActive.h2 && !isActive.h3}
                    onClick={() =>
                      run(() =>
                        editor.chain().focus().setParagraph().run()
                      )
                    }
                    icon={<span className="rte-sheet-txt">Aa</span>}
                    label="Normal"
                  />
                  <SheetBtn
                    active={isActive.h1}
                    onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                    icon={<span className="rte-sheet-txt rte-sheet-txt--h1">H1</span>}
                    label="Title"
                  />
                  <SheetBtn
                    active={isActive.h2}
                    onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                    icon={<span className="rte-sheet-txt rte-sheet-txt--h2">H2</span>}
                    label="Subtitle"
                  />
                  <SheetBtn
                    active={isActive.quote}
                    onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}
                    icon={<IconQuote />}
                    label="Quote"
                  />
                </div>

                {/* Lists */}
                <p className="rte-sheet-label">List</p>
                <div className="rte-sheet-grid">
                  <SheetBtn
                    active={isActive.bullet}
                    onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
                    icon={<IconBulletList />}
                    label="Bullets"
                  />
                  <SheetBtn
                    active={isActive.ordered}
                    onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
                    icon={<IconOrderedList />}
                    label="Numbered"
                  />
                </div>

                {/* Insert */}
                <p className="rte-sheet-label">Insert</p>
                <div className="rte-sheet-grid">
                  <SheetBtn
                    active={isActive.link}
                    onClick={promptLink}
                    icon={<IconLink />}
                    label="Link"
                  />
                </div>

                {/* Actions */}
                <p className="rte-sheet-label">Actions</p>
                <div className="rte-sheet-grid">
                  <SheetBtn
                    onClick={() => run(() => editor.chain().focus().undo().run())}
                    icon={<IconUndo />}
                    label="Undo"
                  />
                  <SheetBtn
                    onClick={() => run(() => editor.chain().focus().redo().run())}
                    icon={<IconRedo />}
                    label="Redo"
                  />
                  <SheetBtn
                    onClick={() =>
                      run(() =>
                        editor.chain().focus().unsetAllMarks().clearNodes().run()
                      )
                    }
                    icon={<IconClear />}
                    label="Clear"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Sheet button (icon + label, 48px+ tall tap target)
   ────────────────────────────────────────────────────────── */
type SheetBtnProps = {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
};

function SheetBtn({ active = false, onClick, icon, label }: SheetBtnProps) {
  return (
    <button
      type="button"
      className={'rte-sheet-btn' + (active ? ' is-active' : '')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span className="rte-sheet-btn-icon">{icon}</span>
      <span className="rte-sheet-btn-label">{label}</span>
    </button>
  );
}

export default RichTextEditor;