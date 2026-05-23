import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(request: NextRequest) {
  const { docId } = await request.json();
  if (!docId) {
    return NextResponse.json({ error: "docId required" }, { status: 400 });
  }

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const printUrl = `${baseUrl}/print/${docId}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Pass auth cookie so the print page can fetch the document
    await page.setCookie({
      name: "access_token",
      value: token,
      domain: new URL(baseUrl).hostname,
      path: "/",
    });

    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60000 });

    // Wait for fonts and layout to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      // NĐ 30/2020: lề trên 20-25mm, dưới 20-25mm, trái 30-35mm (gáy), phải 15-20mm
      margin: { top: "25mm", right: "20mm", bottom: "25mm", left: "30mm" },
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vanban-${docId}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
