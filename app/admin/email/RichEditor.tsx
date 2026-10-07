"use client";

import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Undo2,
  Redo2,
  UserRound,
} from "lucide-react";

/** The email message box: bold, lists, links, headings, and the person's name. */
export default function RichEditor({
  onChange,
  nameToken,
  resetKey,
}: {
  onChange: (html: string, isEmpty: boolean) => void;
  /** Inserted by the Name button; the server turns it into Mailyte's tag. */
  nameToken: string;
  /** Change it to clear the box (after a send). */
  resetKey: number;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2] },
          link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "email-editor min-h-[240px] px-4 py-3 text-[15px] leading-relaxed text-ink outline-none",
          "aria-label": "Email message",
        },
      },
      onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.isEmpty),
    },
    [resetKey],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white focus-within:border-brand">
      {editor && <Toolbar editor={editor} nameToken={nameToken} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, nameToken }: { editor: Editor; nameToken: string }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h2: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
      quote: e.isActive("blockquote"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const before = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (https://...). Leave empty to remove.", before ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const btn = (on: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
      on ? "bg-brand text-white" : "text-ink-soft hover:bg-mist hover:text-ink"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line bg-mist/50 px-2 py-1.5">
      <button type="button" title="Bold" aria-label="Bold" className={btn(s.bold)} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </button>
      <button type="button" title="Italic" aria-label="Italic" className={btn(s.italic)} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" title="Underline" aria-label="Underline" className={btn(s.underline)} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className="h-4 w-4" />
      </button>
      <button type="button" title="Heading" aria-label="Heading" className={btn(s.h2)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </button>
      <button type="button" title="Bullet list" aria-label="Bullet list" className={btn(s.bullet)} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </button>
      <button type="button" title="Numbered list" aria-label="Numbered list" className={btn(s.ordered)} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" title="Quote" aria-label="Quote" className={btn(s.quote)} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </button>
      <button type="button" title="Link" aria-label="Link" className={btn(s.link)} onClick={setLink}>
        <LinkIcon className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-line" />
      <button
        type="button"
        title="Insert the person's first name"
        aria-label="Insert first name"
        onClick={() => editor.chain().focus().insertContent(nameToken).run()}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-leaf-deep hover:bg-leaf/10"
      >
        <UserRound className="h-4 w-4" /> Name
      </button>
      <span className="ml-auto flex gap-1">
        <button type="button" title="Undo" aria-label="Undo" className={btn(false)} disabled={!s.undo} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" title="Redo" aria-label="Redo" className={btn(false)} disabled={!s.redo} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
}
