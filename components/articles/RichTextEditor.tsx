"use client";

import { useEditor, EditorContent, BubbleMenu, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Eraser,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cleanBodyHtml,
  cleanPastedHtml,
  hasLayoutTemplate,
  prepareBodyForEditor,
} from "@/lib/articleBody";
import styles from "./RichTextEditor.module.css";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Called after "Clean up" runs, with the number of empty blocks removed. */
  onCleaned?: (removed: number) => void;
};

type BlockType = "p" | "h2" | "h3" | "h4";

function currentBlock(editor: Editor): BlockType {
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("heading", { level: 4 })) return "h4";
  return "p";
}

function setBlock(editor: Editor, block: BlockType) {
  const chain = editor.chain().focus();
  if (block === "p") chain.setParagraph().run();
  else chain.setHeading({ level: Number(block[1]) as 2 | 3 | 4 }).run();
}

function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  return `https://${url}`;
}

function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-zinc-300 transition-colors",
        "hover:bg-zinc-700/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b]",
        "disabled:pointer-events-none disabled:opacity-35",
        active && "bg-zinc-700 text-white"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden />;
}

const MOD = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘" : "Ctrl";

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the article body…",
  className,
  minHeight = "320px",
  onCleaned,
}: RichTextEditorProps) {
  // Designed layouts (ni-* templates, tables, embeds) open as HTML so their
  // styling isn't lost by accident. Everything else uses the normal editor.
  const lockedToHtml = hasLayoutTemplate(value);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [htmlChosen, setHtmlChosen] = useState(false);
  const htmlMode = lockedToHtml || htmlChosen;
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: htmlMode ? "" : prepareBodyForEditor(value),
    editorProps: {
      attributes: {
        class: styles.content,
        style: `min-height:${minHeight}`,
        "aria-label": "Article body",
      },
      transformPastedHTML: cleanPastedHtml,
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep the editor in sync when the value changes from outside (article load, draft restore).
  useEffect(() => {
    if (!editor || htmlMode) return;
    const prepared = prepareBodyForEditor(value);
    if (prepared !== editor.getHTML() && value !== editor.getHTML()) {
      editor.commands.setContent(prepared, false);
    }
  }, [value, editor, htmlMode]);

  // Turns a designed layout into normal formatted text the admin can edit.
  const convertToNormal = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(prepareBodyForEditor(value), false);
    setHtmlChosen(false);
    setConfirmConvert(false);
    onChange(editor.getHTML());
  }, [editor, value, onChange]);

  const switchToVisual = useCallback(() => {
    if (!editor || lockedToHtml) return;
    editor.commands.setContent(prepareBodyForEditor(value), false);
    setHtmlChosen(false);
  }, [editor, lockedToHtml, value]);

  const openLink = useCallback(() => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
    requestAnimationFrame(() => linkInputRef.current?.focus());
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = normalizeUrl(linkUrl);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    setLinkOpen(false);
  }, [editor, linkUrl]);

  const runCleanup = useCallback(() => {
    if (!editor) return;
    const { html, removed } = cleanBodyHtml(editor.getHTML());
    if (removed > 0) {
      editor.commands.setContent(html, true);
    }
    onCleaned?.(removed);
  }, [editor, onCleaned]);

  // Ctrl/Cmd+K opens the link input.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLink();
      }
    };
    dom.addEventListener("keydown", onKey);
    return () => dom.removeEventListener("keydown", onKey);
  }, [editor, openLink]);

  if (!editor) {
    return (
      <div
        className={cn("rounded-lg border border-zinc-800 bg-zinc-900 animate-pulse", className)}
        style={{ minHeight }}
      />
    );
  }

  const visual = !htmlMode;
  const block = currentBlock(editor);

  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900/60", className)}>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="sticky top-[7.5rem] z-20 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-zinc-800 bg-zinc-900/95 px-1.5 py-1.5 backdrop-blur"
      >
        <select
          aria-label="Text style"
          value={block}
          disabled={!visual}
          onChange={(e) => setBlock(editor, e.target.value as BlockType)}
          className="mr-1 h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#991b1b] disabled:opacity-40"
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          {block === "h4" && <option value="h4">Heading 4</option>}
        </select>

        <ToolButton label="Bold" shortcut={`${MOD}+B`} disabled={!visual} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Italic" shortcut={`${MOD}+I`} disabled={!visual} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Underline" shortcut={`${MOD}+U`} disabled={!visual} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Strikethrough" disabled={!visual} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolButton>

        <Divider />
        <ToolButton label="Heading 2" disabled={!visual} active={block === "h2"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <span className="text-xs font-bold">H2</span>
        </ToolButton>
        <ToolButton label="Heading 3" disabled={!visual} active={block === "h3"} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <span className="text-xs font-bold">H3</span>
        </ToolButton>

        <Divider />
        <ToolButton label="Bullet list" disabled={!visual} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Numbered list" disabled={!visual} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Quote" disabled={!visual} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Divider line" disabled={!visual} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolButton>

        <Divider />
        <ToolButton label="Add link" shortcut={`${MOD}+K`} disabled={!visual} active={editor.isActive("link")} onClick={openLink}>
          <Link2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Remove link" disabled={!visual || !editor.isActive("link")} onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
          <Link2Off className="h-4 w-4" />
        </ToolButton>

        <Divider />
        <ToolButton label="Undo" shortcut={`${MOD}+Z`} disabled={!visual || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Redo" shortcut={`${MOD}+Shift+Z`} disabled={!visual || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Clear formatting" disabled={!visual} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <Eraser className="h-4 w-4" />
        </ToolButton>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={runCleanup}
            disabled={!visual}
            title="Remove empty bullets and blank paragraphs"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-300 hover:bg-zinc-700/70 hover:text-white disabled:opacity-35"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Clean up
          </button>
          <button
            type="button"
            aria-pressed={htmlMode}
            onClick={() => (htmlMode ? switchToVisual() : setHtmlChosen(true))}
            disabled={htmlMode && lockedToHtml}
            title={lockedToHtml ? "Use \"Switch to normal editor\" below to edit this article as normal text" : "Edit the raw HTML"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs hover:bg-zinc-700/70 hover:text-white disabled:cursor-not-allowed",
              htmlMode ? "bg-zinc-700 text-white" : "text-zinc-300"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            HTML
          </button>
        </div>
      </div>

      {linkOpen && visual && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyLink();
          }}
          className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2"
        >
          <label htmlFor="rte-link-url" className="text-xs text-zinc-400">
            Link URL
          </label>
          <input
            id="rte-link-url"
            ref={linkInputRef}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setLinkOpen(false);
                editor.commands.focus();
              }
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://www.niatinsider.com/…"
            className="h-8 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
          />
          <button type="button" onClick={applyLink} className="h-8 rounded-md bg-[#991b1b] px-3 text-xs font-medium text-white hover:bg-[#7f1d1d]">
            Apply
          </button>
          <button type="button" onClick={() => setLinkOpen(false)} className="h-8 rounded-md px-2 text-xs text-zinc-400 hover:text-white">
            Cancel
          </button>
          <span className="w-full text-[11px] text-zinc-500">Leave empty and apply to remove the link.</span>
        </form>
      )}

      {htmlMode ? (
        <div>
          {lockedToHtml && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              {confirmConvert ? (
                <>
                  <p className="min-w-0 flex-1">
                    All the text, headings, lists and links stay. The designed boxes, colours and quote styles are removed. Check the preview, and leave without saving if you change your mind.
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={convertToNormal} className="h-8 rounded-md bg-[#991b1b] px-3 text-xs font-semibold text-white hover:bg-[#7f1d1d]">
                      Yes, switch
                    </button>
                    <button type="button" onClick={() => setConfirmConvert(false)} className="h-8 rounded-md px-3 text-xs text-amber-200 hover:bg-amber-900/40 hover:text-white">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="min-w-0 flex-1">
                    This article uses a designed layout (highlight boxes, styled quotes or tables), so it is shown as HTML to keep that design.
                  </p>
                  <button type="button" onClick={() => setConfirmConvert(true)} className="h-8 shrink-0 rounded-md bg-amber-500 px-3 text-xs font-semibold text-zinc-950 hover:bg-amber-400">
                    Switch to normal editor
                  </button>
                </>
              )}
            </div>
          )}
          <textarea
            aria-label="Article body HTML"
            value={value}
            onChange={(e) => {
              // Stay in HTML mode until the admin switches back, even if the
              // layout markup that forced HTML mode is deleted while typing.
              setHtmlChosen(true);
              onChange(e.target.value);
            }}
            spellCheck={false}
            className="block w-full resize-y rounded-b-lg bg-zinc-950 px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-200 focus:outline-none"
            style={{ minHeight }}
          />
        </div>
      ) : (
        <>
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 120 }}
            shouldShow={({ editor, from, to }) => from !== to && !editor.isActive("image")}
            className="flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
          >
            <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Link" active={editor.isActive("link")} onClick={openLink}>
              <Link2 className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Heading 2" active={block === "h2"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <span className="text-xs font-bold">H2</span>
            </ToolButton>
            <ToolButton label="Heading 3" active={block === "h3"} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <span className="text-xs font-bold">H3</span>
            </ToolButton>
          </BubbleMenu>
          <EditorContent editor={editor} />
        </>
      )}
    </div>
  );
}
