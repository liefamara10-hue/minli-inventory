import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "民力库存管理",
  description: "产品库存、每日进出货与销量排名管理。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <a className="export-stocktake" href="/inventory/api/stocktake-export" download="monthly-stocktake.pdf">
          导出盘点 PDF
        </a>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.addEventListener('click',function(e){var link=e.target.closest('a.back');if(link){e.preventDefault();window.location.assign('/inventory/');return;}if(e.target.closest('button.ghost')){e.preventDefault();window.location.reload();}},true);if(location.search.includes('view=products')){var h=document.querySelector('.pagegrid h1');if(h&&!document.querySelector('.stocktake-link')){var a=document.createElement('a');a.className='stocktake-link';a.href='/inventory/api/stocktake-export';a.download='monthly-stocktake.pdf';a.textContent='导出盘点 PDF';h.insertAdjacentElement('afterend',a);}}",
          }}
        />
      </body>
    </html>
  );
}
