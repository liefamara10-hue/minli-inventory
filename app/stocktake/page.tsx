import { asc } from "drizzle-orm";
import { getDb } from "../../db";
import { products } from "../../db/schema";
import "./stocktake.css";

export default async function StocktakePage() {
  const rows = await getDb().select().from(products).orderBy(asc(products.name));
  const generatedAt = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Shanghai" }).format(new Date());
  return (
    <main className="stocktake-page">
      <header className="stocktake-header">
        <div><p>民力库存管理</p><h1>月度库存盘点清单</h1><span>生成时间：{generatedAt}</span></div>
        <a href="/inventory/?view=products">返回产品清单</a>
      </header>
      <p className="stocktake-tip">现场盘点时填写“实盘数量”；差异 = 实盘数量 − 账面库存。可使用手机浏览器的“打印 / 另存为 PDF”保存本次清单。</p>
      <section className="stocktake-list">
        <div className="stocktake-row stocktake-title"><span>产品</span><span>账面库存</span><span>实盘数量</span><span>差异</span></div>
        {rows.length ? rows.map((product, index) => <div className="stocktake-row" key={product.id}><span><em>{index + 1}</em>{product.name}</span><strong>{product.stock}</strong><span className="blank"></span><span className="blank"></span></div>) : <p className="no-products">暂无产品，请先录入产品后再生成盘点清单。</p>}
      </section>
    </main>
  );
}
