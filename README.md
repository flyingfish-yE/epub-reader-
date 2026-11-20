# 轻小说阅读器（书架 + 原阅读器整合版）

## StackBlitz 运行
1. 将整个项目导入 StackBlitz（选择 Vite 项目 / Upload project）。
2. 安装 `package.json` 中依赖。
3. 启动命令为 `npm run start`，StackBlitz 会打开 Web Preview。

## 项目结构
- `index.html`：书架首页（保留原书架原型的收藏、最近阅读、Cover Flow、导入、设置、备份等交互）
- `reader.html`：阅读页面，使用原阅读器 UI/图片工具栏布局
- `src/shelf.js`：书架逻辑与 `Library` 适配层
- `src/reader.js`：EPUB.js 加载、阅读位置恢复、阅读进度保存、插图缩放与设置
- `src/shelf.css`：书架原型样式
- `src/reader.css`：原阅读器样式与必要的阅读页适配
- `legacy/`：原始阅读器 JS/CSS 原样备份

## 数据存储
- EPUB 文件二进制存入 IndexedDB（`lnreader-db`），不是只保存文件名。
- 书籍元数据、收藏和阅读进度保存在 localStorage。
- 每本书的阅读位置独立保存为 EPUB CFI。
- 每本书的插图尺寸/对齐设置按图片资源独立保存。

## 注意
- 浏览器清理网站数据会同时清除本地 EPUB 文件与阅读记录，请定期导出书架 JSON 备份。
- 示例书目仅用于预览书架 UI，不包含 EPUB 文件；点击示例书会提示导入真实 EPUB。
- 图片设置会应用于 EPUB 正文中的图片。不同 EPUB 的排版 XHTML 结构可能存在差异，复杂的绝对定位插图可能需要按具体书籍调优。
