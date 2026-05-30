import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";

// TextStyle extended with fontSize attribute.
// Using .extend() registers the textStyle mark AND adds fontSize — no need for TextStyle separately.
export const FontSizeExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
        renderHTML: (attrs) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
});

// Shared extensions for all TipTap editor instances (RichEditor + SectionEditor in nd30-document).
// Do NOT include Placeholder — each editor configures its own placeholder text.
export const sharedExtensions = [
  StarterKit,
  FontSizeExtension,  // IS TextStyle.extend() → registers textStyle mark + fontSize attr
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  CharacterCount,
];
