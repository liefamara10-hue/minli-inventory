import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";

const text = (value: string) => `<FEFF${Array.from(value).map((c) => c.charCodeAt(0).toString(16).padStart(4, "0")).join("")}>`;
const wrap = (body: string) => `${body}\nendobj\n`;

function createPdf(rows: Array<{ name: string; stock: number }>) {
  const perPage = 28, count = Math.max(1, Math.ceil(rows.length / perPage));
  const pageIds = Array.from({ length: count }, (_, i) => 3 + i);
  const contentIds = Array.from({ length: count }, (_, i) => 3 + count + i);
  const fontId = 3 + count * 2, cidId = fontId + 1, objects: Record<number, string> = {};
  objects[1] = wrap("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = wrap(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${count} >>`);
  pageIds.forEach((pageId, page) => {
    const lines = ["q 0.07 0.23 0.22 rg 0 790 595 52 re f Q", `BT /F1 20 Tf 42 812 Td ${text("民力库存管理 - 月度库存盘点清单")} Tj ET`, `BT /F1 10 Tf 42 782 Td ${text(`第 ${page + 1} 页 / 共 ${count} 页   账面库存以导出时数据为准`)} Tj ET`, `BT /F1 11 Tf 48 730 Td ${text("产品")} Tj ET`, `BT /F1 11 Tf 315 730 Td ${text("账面库存")} Tj ET`, `BT /F1 11 Tf 405 730 Td ${text("实盘数量")} Tj ET`, `BT /F1 11 Tf 498 730 Td ${text("差异")} Tj ET`];
    rows.slice(page * perPage, (page + 1) * perPage).forEach((row, i) => { const y = 700 - i * 23, name = `${page * perPage + i + 1}. ${row.name.length > 18 ? `${row.name.slice(0, 18)}…` : row.name}`; lines.push(`0.80 0.86 0.84 RG 42 ${y - 7} m 553 ${y - 7} l S`, `BT /F1 11 Tf 48 ${y} Td ${text(name)} Tj ET`, `BT /F1 11 Tf 326 ${y} Td ${text(String(row.stock))} Tj ET`, `BT /F1 11 Tf 426 ${y} Td ${text("____________")} Tj ET`, `BT /F1 11 Tf 503 ${y} Td ${text("______")} Tj ET`); });
    lines.push(`BT /F1 9 Tf 42 32 Td ${text("实盘数量由现场盘点填写；差异 = 实盘数量 - 账面库存")} Tj ET`);
    const stream = lines.join("\n");
    objects[pageId] = wrap(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[page]} 0 R >>`);
    objects[contentIds[page]] = wrap(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects[fontId] = wrap(`<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [${cidId} 0 R] >>`);
  objects[cidId] = wrap("<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /DW 1000 >>");
  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", offsets = [0];
  for (let id = 1; id <= cidId; id++) { offsets[id] = output.length; output += `${id} 0 obj\n${objects[id]}`; }
  const xref = output.length; output += `xref\n0 ${cidId + 1}\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${cidId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return output;
}

export async function GET() { const rows = await getDb().select({ name: products.name, stock: products.stock }).from(products).orderBy(asc(products.name)); return new Response(createPdf(rows), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=monthly-stocktake.pdf" } }); }
