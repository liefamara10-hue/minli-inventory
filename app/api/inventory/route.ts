import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { inventoryRecords, products } from "../../../db/schema";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "操作失败，请稍后重试";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const period = new URL(request.url).searchParams.get("period");
    const startDate = new Date();

    if (period === "week") {
      const weekday = startDate.getDay() || 7;
      startDate.setDate(startDate.getDate() - weekday + 1);
    }
    if (period === "month") startDate.setDate(1);

    const start = startDate.toISOString().slice(0, 10);
    const [productRows, records, ranking] = await Promise.all([
      db.select().from(products).orderBy(desc(products.createdAt)),
      db
        .select({
          id: inventoryRecords.id,
          type: inventoryRecords.type,
          quantity: inventoryRecords.quantity,
          recordDate: inventoryRecords.recordDate,
          productName: products.name,
        })
        .from(inventoryRecords)
        .innerJoin(products, eq(inventoryRecords.productId, products.id))
        .orderBy(desc(inventoryRecords.recordDate), desc(inventoryRecords.id))
        .limit(100),
      period
        ? db
            .select({
              id: products.id,
              name: products.name,
              total: sql<number>`coalesce(sum(${inventoryRecords.quantity}), 0)`,
            })
            .from(inventoryRecords)
            .innerJoin(products, eq(inventoryRecords.productId, products.id))
            .where(
              and(
                eq(inventoryRecords.type, "out"),
                gte(inventoryRecords.recordDate, start),
              ),
            )
            .groupBy(products.id, products.name)
            .orderBy(desc(sql`coalesce(sum(${inventoryRecords.quantity}), 0)`))
        : Promise.resolve([]),
    ]);

    return Response.json({ products: productRows, records, ranking });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const data = await request.json();

    if (data.action === "product") {
      const name = String(data.name ?? "").trim();
      const stock = Number(data.stock ?? 0);
      const warningStock = Number(data.warningStock ?? 0);
      if (!name) return Response.json({ error: "请填写产品名称" }, { status: 400 });
      if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(warningStock) || warningStock < 0) {
        return Response.json({ error: "库存必须为不小于 0 的数字" }, { status: 400 });
      }

      const sku = String(data.sku ?? "").trim() || `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const [product] = await db
        .insert(products)
        .values({ name, sku, stock, warningStock, totalSold: 0 })
        .returning();
      return Response.json({ product });
    }

    if (data.action === "record") {
      const productId = Number(data.productId);
      const type = data.type === "in" ? "in" : data.type === "out" ? "out" : null;
      const quantity = Number(data.quantity);
      const recordDate = String(data.recordDate ?? "");
      if (!Number.isInteger(productId) || !type || !Number.isFinite(quantity) || quantity <= 0 || !recordDate) {
        return Response.json({ error: "请完整填写产品、业务类型、数量和日期" }, { status: 400 });
      }

      const [product] = await db.select().from(products).where(eq(products.id, productId));
      if (!product) return Response.json({ error: "产品不存在" }, { status: 404 });
      if (type === "out" && product.stock < quantity) {
        return Response.json({ error: "出货数量不能大于当前库存" }, { status: 400 });
      }

      const delta = type === "in" ? quantity : -quantity;
      await db.batch([
        db.insert(inventoryRecords).values({ productId, type, quantity, recordDate }),
        db
          .update(products)
          .set({
            stock: sql`${products.stock} + ${delta}`,
            totalSold: type === "out" ? sql`${products.totalSold} + ${quantity}` : products.totalSold,
          })
          .where(eq(products.id, productId)),
      ]);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id)) return Response.json({ error: "无效的产品" }, { status: 400 });
    const db = getDb();
    await db.delete(products).where(eq(products.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
