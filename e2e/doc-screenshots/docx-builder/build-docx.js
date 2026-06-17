// build-docx.js
// Đọc manifest.json + content-data-*.js, build file .docx hướng dẫn
// sử dụng CivicAI.
//
// Chạy: node build-docx.js
// Output: huong-dan-su-dung-civicai.docx

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun,
  HeadingLevel, AlignmentType, PageBreak, BorderStyle,
  WidthType, LevelFormat, TableOfContents,
} = require("docx");

// ── Cấu hình đường dẫn ──
const OUTPUT_DIR = path.join(__dirname, "..", "output"); // e2e/doc-screenshots/output
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

// ── Đọc dữ liệu nội dung (theo từng phần) ──
const { CHAPTERS_PART1 } = require("./content-data-part1");
const { CHAPTERS_PART2 } = require("./content-data-part2");
const { CHAPTERS_PART3 } = require("./content-data-part3");
const { CHAPTERS_PART4 } = require("./content-data-part4");

const ALL_CHAPTERS = [
  ...CHAPTERS_PART1,
  ...CHAPTERS_PART2,
  ...CHAPTERS_PART3,
  ...CHAPTERS_PART4,
];

// ── Đọc manifest, map order -> entry ──
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
const byOrder = {};
for (const entry of manifest) {
  byOrder[entry.order] = entry;
}

// ── Đọc kích thước PNG (đọc header IHDR, không cần thư viện ngoài) ──
function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  // PNG: width tại byte 16-19, height tại byte 20-23 (big-endian)
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

// ── Tính kích thước hiển thị trong docx (pixels @ 96 DPI) ──
// docx v9: transformation.width/height nhận pixels, tự chuyển sang EMU nội bộ.
// Khổ A4, lề 2cm mỗi bên -> content width ~ 17cm - 4cm = ~15cm
// 15cm @ 96 DPI = 15 / 2.54 * 96 ≈ 567 px
const PX_PER_CM = 96 / 2.54; // ≈ 37.795 px/cm
const MAX_WIDTH_CM = 15;
const MAX_HEIGHT_CM = 20; // tránh ảnh quá cao (ví dụ citation sidebar dọc)

function computeImageSize(pngPath) {
  const { width, height } = getPngDimensions(pngPath);
  const aspect = height / width;

  let displayWidthPx = Math.round(MAX_WIDTH_CM * PX_PER_CM);
  let displayHeightPx = Math.round(displayWidthPx * aspect);

  const maxHeightPx = Math.round(MAX_HEIGHT_CM * PX_PER_CM);
  if (displayHeightPx > maxHeightPx) {
    displayHeightPx = maxHeightPx;
    displayWidthPx = Math.round(displayHeightPx / aspect);
  }

  return { width: displayWidthPx, height: displayHeightPx };
}

// ── Helper: tạo 1 block ảnh + heading + giải thích ──
function buildImageBlock(imageSpec) {
  const entry = byOrder[imageSpec.order];
  if (!entry) {
    console.warn(`  ! Không tìm thấy manifest entry cho order ${imageSpec.order}`);
    return [];
  }

  const pngPath = path.join(OUTPUT_DIR, entry.module, entry.file);
  if (!fs.existsSync(pngPath)) {
    console.warn(`  ! Không tìm thấy file ảnh: ${pngPath}`);
    return [];
  }

  const { width, height } = computeImageSize(pngPath);
  const imageBuffer = fs.readFileSync(pngPath);

  const children = [];

  // Heading nhỏ cho bước
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun(imageSpec.heading)],
    })
  );

  // Ảnh
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          type: "png",
          data: imageBuffer,
          transformation: { width, height },
        }),
      ],
    })
  );

  // Caption (in nghiêng, nhỏ, dưới ảnh)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: entry.title,
          italics: true,
          size: 20, // 10pt
          color: "666666",
        }),
      ],
    })
  );

  // Đoạn giải thích chi tiết (hỗ trợ \n -> nhiều Paragraph)
  const bodyLines = imageSpec.body.split("\n");
  for (const line of bodyLines) {
    if (line.trim() === "") continue;
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun(line)],
      })
    );
  }

  return children;
}

// ── Helper: tạo 1 chương (phân hệ) ──
function buildChapter(chapter, isFirst) {
  const children = [];

  if (!isFirst) {
    children.push(
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(chapter.title)],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun(chapter.intro)],
    })
  );

  for (const imageSpec of chapter.images) {
    children.push(...buildImageBlock(imageSpec));
  }

  return children;
}

// ── Build document ──
function main() {
  console.log(`Tổng số chương: ${ALL_CHAPTERS.length}`);

  const bodyChildren = [];

  // Trang bìa
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 400 },
      children: [
        new TextRun({
          text: "TÀI LIỆU HƯỚNG DẪN SỬ DỤNG",
          bold: true,
          size: 48,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [
        new TextRun({
          text: "Hệ thống CivicAI",
          bold: true,
          size: 36,
          color: "0F6E56",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Hệ đa tác tử AI hỗ trợ hành chính công cấp xã/phường",
          italics: true,
          size: 24,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),

    // Mục lục
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Mục lục")],
    }),
    new TableOfContents("Mục lục", {
      hyperlink: true,
      headingStyleRange: "1-2",
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  ALL_CHAPTERS.forEach((chapter, idx) => {
    bodyChildren.push(...buildChapter(chapter, idx === 0));
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 24 } }, // 12pt
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1134, bottom: 1440, left: 1134 },
          },
        },
        children: bodyChildren,
      },
    ],
  });

  Packer.toBuffer(doc).then((buffer) => {
    const outPath = path.join(__dirname, "huong-dan-su-dung-civicai.docx");
    fs.writeFileSync(outPath, buffer);
    console.log(`Đã tạo: ${outPath}`);
    console.log(`Kích thước: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  });
}

main();