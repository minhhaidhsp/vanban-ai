// test-minimal.js — kiểm tra từng thành phần
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, PageBreak, AlignmentType } = require("docx");

const OUTPUT_DIR = path.join(__dirname, "..", "output");

async function test(name, docFn) {
  try {
    const doc = docFn();
    const buf = await Packer.toBuffer(doc);
    const outPath = path.join(__dirname, `test-${name}.docx`);
    fs.writeFileSync(outPath, buf);
    console.log(`OK [${name}]: ${(buf.length/1024).toFixed(0)} KB → ${outPath}`);
  } catch(e) {
    console.error(`ERR [${name}]:`, e.message);
  }
}

async function main() {
  // Test 1: chỉ text
  await test("1-text-only", () => new Document({
    sections: [{ children: [
      new Paragraph({ children: [new TextRun("Hello CivicAI")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Chương 1")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Mục 1.1")] }),
    ]}],
  }));

  // Test 2: 1 ảnh nhỏ
  const img1 = fs.readFileSync(path.join(OUTPUT_DIR, "01-cong-dan", "01-landing-hero.png"));
  await test("2-one-image", () => new Document({
    sections: [{ children: [
      new Paragraph({ children: [new TextRun("Ảnh test:")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: "png", data: img1, transformation: { width: 5400000, height: 3037500 } })],
      }),
    ]}],
  }));

  // Test 3: page break
  await test("3-pagebreak", () => new Document({
    sections: [{ children: [
      new Paragraph({ children: [new TextRun("Trang 1")] }),
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ children: [new TextRun("Trang 2")] }),
    ]}],
  }));
}

main();
