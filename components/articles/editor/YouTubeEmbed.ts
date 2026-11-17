import { Node, mergeAttributes } from "@tiptap/react";
import { isYouTubeEmbedSrc, parseYouTubeUrl, youTubeEmbedUrl } from "@/lib/youtube";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    youtubeEmbed: {
      /** Inserts a YouTube video block at the cursor from any YouTube link. */
      setYouTubeEmbed: (options: { url: string }) => ReturnType;
    };
  }
}

/**
 * A YouTube video as its own block in the article body. Stored as
 * `<div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/ID"></iframe></div>`;
 * only YouTube embed addresses are accepted, so no other iframe can get in.
 */
export const YouTubeEmbed = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return { src: { default: null } };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-youtube-video]",
        getAttrs: (el) => {
          const src = (el as HTMLElement).querySelector("iframe")?.getAttribute("src");
          return isYouTubeEmbedSrc(src) ? { src } : false;
        },
      },
      {
        tag: "iframe[src]",
        getAttrs: (el) => {
          const src = (el as HTMLElement).getAttribute("src");
          return isYouTubeEmbedSrc(src) ? { src } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      { "data-youtube-video": "" },
      [
        "iframe",
        mergeAttributes({
          src: HTMLAttributes.src,
          title: "YouTube video",
          width: "560",
          height: "315",
          frameborder: "0",
          loading: "lazy",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          referrerpolicy: "strict-origin-when-cross-origin",
          allowfullscreen: "true",
        }),
      ],
    ];
  },

  addCommands() {
    return {
      setYouTubeEmbed:
        ({ url }) =>
        ({ commands }) => {
          const ref = parseYouTubeUrl(url);
          if (!ref) return false;
          return commands.insertContent({ type: this.name, attrs: { src: youTubeEmbedUrl(ref) } });
        },
    };
  },
});
