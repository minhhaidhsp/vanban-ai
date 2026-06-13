import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";

// TextStyle extended with fontSize — registers textStyle mark + adds fontSize attr
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

// Line height + paragraph spacing + indent for paragraph/heading nodes
export const ParagraphFormatExtension = Extension.create({
  name: "paragraphFormat",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
          marginTop: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.marginTop || null,
            renderHTML: (attrs) =>
              attrs.marginTop ? { style: `margin-top: ${attrs.marginTop}` } : {},
          },
          marginBottom: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.marginBottom || null,
            renderHTML: (attrs) =>
              attrs.marginBottom ? { style: `margin-bottom: ${attrs.marginBottom}` } : {},
          },
          marginLeft: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.marginLeft || null,
            renderHTML: (attrs) =>
              attrs.marginLeft ? { style: `margin-left: ${attrs.marginLeft}` } : {},
          },
          marginRight: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.marginRight || null,
            renderHTML: (attrs) =>
              attrs.marginRight ? { style: `margin-right: ${attrs.marginRight}` } : {},
          },
          textIndent: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.textIndent || null,
            renderHTML: (attrs) =>
              attrs.textIndent ? { style: `text-indent: ${attrs.textIndent}` } : {},
          },
        },
      },
    ];
  },
});

// Tab/Shift-Tab to increase/decrease paragraph left indent in 10mm steps
export const TabIndentExtension = Extension.create({
  name: "tabIndent",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const attrs = this.editor.getAttributes("paragraph");
        const current = parseFloat((attrs.marginLeft || "0").replace("mm", "")) || 0;
        const next = Math.min(current + 10, 80);
        this.editor.chain().focus()
          .updateAttributes("paragraph", { marginLeft: `${next}mm` })
          .run();
        return true;
      },
      "Shift-Tab": () => {
        const attrs = this.editor.getAttributes("paragraph");
        const current = parseFloat((attrs.marginLeft || "0").replace("mm", "")) || 0;
        const next = Math.max(current - 10, 0);
        this.editor.chain().focus()
          .updateAttributes("paragraph", {
            marginLeft: next > 0 ? `${next}mm` : null,
          })
          .run();
        return true;
      },
    };
  },
});

// Shared extensions for all TipTap editor instances.
// Do NOT include Placeholder — each editor configures its own placeholder text.
export const sharedExtensions = [
  StarterKit,
  FontSizeExtension,        // TextStyle mark + fontSize attr
  FontFamily,               // fontFamily attr on textStyle mark
  ParagraphFormatExtension, // lineHeight + margin attrs on paragraphs
  TabIndentExtension,       // Tab/Shift-Tab indent
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  CharacterCount,
];
