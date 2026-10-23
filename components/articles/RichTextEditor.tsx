"use client";

import { useEditor, EditorContent, BubbleMenu, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { NodeSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Code2,
  Eraser,
  ImagePlus,
  Italic,
  Loader2,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cleanBodyHtml,
  cleanPastedHtml,
  hasUnsupportedMarkup,
  isHostedMediaUrl,
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
  /**
   * Uploads an image for the body and returns its URL, or null when the
   * upload failed (the caller reports the error). Without it the editor has
   * no image tools.
   */
  onUploadImage?: (file: File) => Promise<string | null>;
  /** The article's carousel images, offered for placing in the body too. */
  articleImages?: string[];
};

const IMAGE_TYPES = /^image\//;

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => IMAGE_TYPES.test(f.type));
}

/**
 * Moves the selected block node (an image) one place up or down among its
 * siblings. Returns false when it is already first/last or nothing is selected.
 */
function moveSelectedNode(editor: Editor, direction: -1 | 1): boolean {
  const { state, view } = editor;
  const sel = state.selection;
  if (!(sel instanceof NodeSelection)) return false;
  const $pos = state.doc.resolve(sel.from);
  const parent = $pos.parent;
  const target = $pos.index() + direction;
  if (target < 0 || target >= parent.childCount) return false;
  const neighbour = parent.child(target);
  const tr = state.tr.delete(sel.from, sel.to);
  const insertAt = direction === -1 ? sel.from - neighbour.nodeSize : sel.from + neighbour.nodeSize;
  tr.insert(insertAt, sel.node);
  tr.setSelection(NodeSelection.create(tr.doc, insertAt));
  view.dispatch(tr.scrollIntoView());
  return true;
}

function canMoveSelectedNode(editor: Editor, direction: -1 | 1): boolean {
  const sel = editor.state.selection;
  if (!(sel instanceof NodeSelection)) return false;
  const $pos = editor.state.doc.resolve(sel.from);
  const target = $pos.index() + direction;
  return target >= 0 && target < $pos.parent.childCount;
}

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
  onUploadImage,
  articleImages = [],
}: RichTextEditorProps) {
  // Bodies with layout markup the visual editor would strip open as HTML,
  // unless the admin chooses to switch anyway.
  const [forcedVisual, setForcedVisual] = useState(false);
  const lockedToHtml = hasUnsupportedMarkup(value) && !forcedVisual;
  const [htmlChosen, setHtmlChosen] = useState(false);
  const htmlMode = lockedToHtml || htmlChosen;
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const imageAltRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  // editorProps are fixed when the editor is created; drop/paste read the
  // current upload callback through this ref.
  const uploadRef = useRef(onUploadImage);
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    uploadRef.current = onUploadImage;
  }, [onUploadImage]);

  /** Uploads files and inserts them, in order, at `pos` (or the cursor). */
  const uploadAndInsert = useCallback(async (ed: Editor, files: File[], alt: string, pos?: number) => {
    const upload = uploadRef.current;
    if (!upload || files.length === 0) return;
    setImageUploading(true);
    try {
      let at = pos;
      for (const file of files) {
        const src = await upload(file);
        if (!src) continue;
        const node = ed.schema.nodes.image.create({ src, alt: alt || null });
        if (at === undefined) {
          ed.chain().focus().setImage({ src, alt }).run();
        } else {
          ed.view.dispatch(ed.state.tr.insert(at, node));
          at += node.nodeSize;
        }
      }
    } finally {
      setImageUploading(false);
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Only real web addresses. Without this, words like "B.Tech" (.tech is
        // a real domain ending) were turned into links to http://B.Tech.
        shouldAutoLink: (text) => /^(https?:\/\/|www\.)/i.test(text),
        // Same rule for links found in pasted text, which TipTap checks here.
        isAllowedUri: (url, ctx) =>
          ctx.defaultValidate(url) && /^(https?:\/\/|www\.|mailto:|tel:|\/|#)/i.test(url),
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
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
      // Image files dropped or pasted into the text are uploaded and placed
      // there. Without an upload callback the browser default is blocked so
      // no data: image ends up in the body.
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFiles(event.dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        const ed = editorRef.current;
        if (!ed || !uploadRef.current) return true;
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        // Insert between blocks: at the end of the top-level block dropped on.
        let pos: number | undefined;
        if (coords) {
          const $pos = view.state.doc.resolve(coords.pos);
          pos = $pos.depth > 0 ? $pos.after(1) : coords.pos;
        }
        void uploadAndInsert(ed, files, "", pos);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (files.length === 0) return false;
        // Clipboard HTML with text (a paste from Docs) goes through cleanPastedHtml.
        if (event.clipboardData?.getData("text/plain")) return false;
        event.preventDefault();
        const ed = editorRef.current;
        if (ed && uploadRef.current) void uploadAndInsert(ed, files, "");
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Keep the editor in sync when the value changes from outside (article load, draft restore).
  useEffect(() => {
    if (!editor || htmlMode) return;
    const prepared = prepareBodyForEditor(value);
    if (prepared !== editor.getHTML() && value !== editor.getHTML()) {
      editor.commands.setContent(prepared, false);
    }
  }, [value, editor, htmlMode]);

  const switchToVisual = useCallback(() => {
    if (!editor) return;
    if (lockedToHtml) {
      const ok = window.confirm(
        "This article uses a custom layout (template blocks, tables or embeds). The visual editor keeps the text but removes that layout. Switch anyway?"
      );
      if (!ok) return;
      setForcedVisual(true);
      editor.commands.setContent(prepareBodyForEditor(value), false);
      setHtmlChosen(false);
      // Save what the visual editor kept, so the body matches what is shown.
      onChange(editor.getHTML());
      return;
    }
    editor.commands.setContent(prepareBodyForEditor(value), false);
    setHtmlChosen(false);
  }, [editor, lockedToHtml, value, onChange]);

  const openLink = useCallback(() => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setImageOpen(false);
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

  const openImage = useCallback(() => {
    setLinkOpen(false);
    setImageAlt("");
    setImageOpen(true);
    requestAnimationFrame(() => imageAltRef.current?.focus());
  }, []);

  const closeImage = useCallback(() => {
    setImageOpen(false);
    editor?.commands.focus();
  }, [editor]);

  /** Places an already uploaded image (from the carousel) at the cursor. */
  const insertExistingImage = useCallback(
    (src: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src, alt: imageAlt.trim() }).run();
      setImageOpen(false);
    },
    [editor, imageAlt]
  );

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

        <ToolButton
          label="Insert table"
          disabled={!visual || editor.isActive("table")}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className="h-4 w-4" />
        </ToolButton>
        {onUploadImage && (
          <ToolButton label="Insert image at the cursor" disabled={!visual || imageUploading} active={imageOpen} onClick={openImage}>
            {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </ToolButton>
        )}

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
            title={
              lockedToHtml
                ? "Switch to the visual editor (removes the custom layout)"
                : htmlMode
                  ? "Back to the visual editor"
                  : "Edit the raw HTML"
            }
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

      {visual && editor.isActive("table") && (
        <div
          role="toolbar"
          aria-label="Table"
          className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs"
        >
          <span className="mr-1 text-zinc-500">Table:</span>
          {([
            ["Row above", () => editor.chain().focus().addRowBefore().run()],
            ["Row below", () => editor.chain().focus().addRowAfter().run()],
            ["Column left", () => editor.chain().focus().addColumnBefore().run()],
            ["Column right", () => editor.chain().focus().addColumnAfter().run()],
          ] as const).map(([label, run]) => (
            <button
              key={label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
              className="h-7 rounded-md border border-zinc-700 px-2 text-zinc-200 hover:bg-zinc-700/70 hover:text-white"
            >
              + {label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            className="h-7 rounded-md border border-zinc-700 px-2 text-zinc-200 hover:bg-zinc-700/70 hover:text-white"
            title="Make the first row a header row (bold, shaded), or back to a normal row"
          >
            Header row on/off
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
            disabled={!editor.can().mergeOrSplit()}
            className="h-7 rounded-md border border-zinc-700 px-2 text-zinc-200 hover:bg-zinc-700/70 hover:text-white disabled:opacity-35"
            title="Select several cells to merge them, or click a merged cell to split it"
          >
            Merge / split cells
          </button>
          <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden />
          {([
            ["Delete row", () => editor.chain().focus().deleteRow().run()],
            ["Delete column", () => editor.chain().focus().deleteColumn().run()],
            ["Delete table", () => editor.chain().focus().deleteTable().run()],
          ] as const).map(([label, run]) => (
            <button
              key={label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
              className="h-7 rounded-md px-2 text-red-300 hover:bg-red-950/60 hover:text-red-200"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {visual && editor.isActive("image") && (() => {
        const src: string = editor.getAttributes("image").src ?? "";
        return (
          <div
            role="toolbar"
            aria-label="Image"
            className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs"
          >
            <span className="mr-1 text-zinc-500">Image:</span>
            <label htmlFor="rte-image-alt-edit" className="sr-only">
              Alt text
            </label>
            <input
              id="rte-image-alt-edit"
              value={editor.getAttributes("image").alt ?? ""}
              onChange={(e) => editor.chain().updateAttributes("image", { alt: e.target.value }).run()}
              placeholder="Alt text: what the image shows"
              className="h-7 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => moveSelectedNode(editor, -1)}
              disabled={!canMoveSelectedNode(editor, -1)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-2 text-zinc-200 hover:bg-zinc-700/70 hover:text-white disabled:opacity-35"
              title="Move the image above the previous block"
            >
              <ArrowUp className="h-3.5 w-3.5" /> Up
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => moveSelectedNode(editor, 1)}
              disabled={!canMoveSelectedNode(editor, 1)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-2 text-zinc-200 hover:bg-zinc-700/70 hover:text-white disabled:opacity-35"
              title="Move the image below the next block"
            >
              <ArrowDown className="h-3.5 w-3.5" /> Down
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().deleteSelection().run()}
              className="h-7 rounded-md px-2 text-red-300 hover:bg-red-950/60 hover:text-red-200"
            >
              Remove image
            </button>
            {src && !isHostedMediaUrl(src) && (
              <span className="w-full text-[11px] text-amber-300">
                This image is not on media.niatinsider.com, so the live site will not show it. Upload it again with the image button.
              </span>
            )}
          </div>
        );
      })()}

      {imageOpen && visual && onUploadImage && (
        <div className="space-y-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="rte-image-alt" className="text-xs text-zinc-400">
              Alt text
            </label>
            <input
              id="rte-image-alt"
              ref={imageAltRef}
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeImage();
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="What the image shows, e.g. Students at the NIAT Hyderabad campus library"
              className="h-8 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
            />
            <input
              ref={imageFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = imageFiles(e.target.files);
                e.target.value = "";
                setImageOpen(false);
                void uploadAndInsert(editor, files, imageAlt.trim());
              }}
            />
            <button
              type="button"
              onClick={() => imageFileRef.current?.click()}
              className="h-8 rounded-md bg-[#991b1b] px-3 text-xs font-medium text-white hover:bg-[#7f1d1d]"
            >
              Upload image…
            </button>
            <button type="button" onClick={closeImage} className="h-8 rounded-md px-2 text-xs text-zinc-400 hover:text-white">
              Cancel
            </button>
          </div>
          {articleImages.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] text-zinc-500">
                Or place one of the article&apos;s images. It stays in the carousel under the title too; remove it there if it should only show here.
              </p>
              <div className="flex flex-wrap gap-2">
                {articleImages.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => insertExistingImage(url)}
                    title="Insert at the cursor"
                    className="h-14 w-20 overflow-hidden rounded border border-zinc-700 hover:border-[#991b1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-zinc-500">
            The image goes where the cursor is. You can also drag or paste image files straight into the text, and click an image to move it or edit its alt text.
          </p>
        </div>
      )}

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
            <p className="border-b border-amber-900/50 bg-amber-950/30 px-4 py-2 text-xs text-amber-200">
              This article uses a custom layout (template blocks, tables or embeds) that the visual editor would remove, so it opens in HTML mode. Check your changes in the preview, or click HTML to switch to the visual editor anyway.
            </p>
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
        // Own wrapper: BubbleMenu moves its element out of React's tree, so
        // toolbars shown above (table, link) must not be its direct siblings.
        <div>
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
        </div>
      )}
    </div>
  );
}
