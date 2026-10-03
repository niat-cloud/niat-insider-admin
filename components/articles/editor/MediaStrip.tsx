"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MediaStripProps = {
  images: string[];
  cover: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: (url: string) => void;
  onSetCover: (url: string) => void;
  onMove: (url: string, direction: -1 | 1) => void;
};

/**
 * Article images. On the live site they form the carousel under the title,
 * in this order; the cover is used on cards and social shares.
 */
export function MediaStrip({ images, cover, onUpload, onRemove, onSetCover, onMove }: MediaStripProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of list) await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-lg border border-dashed p-3 transition-colors",
        dragOver ? "border-[#991b1b] bg-[#991b1b]/10" : "border-zinc-800 bg-zinc-900/40"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-400">
          Images <span className="text-zinc-600">· shown as the carousel under the title, in this order. Drop files here to upload.</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={url} className="group relative h-24 w-32 overflow-hidden rounded-md border border-zinc-700 bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {cover === url && (
              <span className="absolute left-1 top-1 rounded bg-[#991b1b] px-1.5 py-0.5 text-[10px] font-medium text-white">Cover</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <div className="flex">
                <button type="button" disabled={i === 0} onClick={() => onMove(url, -1)} className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30" aria-label="Move left" title="Move left">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={i === images.length - 1} onClick={() => onMove(url, 1)} className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30" aria-label="Move right" title="Move right">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex">
                <button type="button" onClick={() => onSetCover(url)} className="rounded p-1 text-white hover:bg-white/20" aria-label="Set as cover" title="Set as cover">
                  <Star className={cn("h-3.5 w-3.5", cover === url && "fill-[#ef4444] text-[#ef4444]")} />
                </button>
                <button type="button" onClick={() => onRemove(url)} className="rounded p-1 text-white hover:bg-red-500/80" aria-label="Remove image" title="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-md border border-zinc-700 text-xs text-zinc-400 hover:border-zinc-500 hover:text-white disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {uploading ? "Uploading…" : "Add images"}
        </button>
      </div>
    </div>
  );
}
