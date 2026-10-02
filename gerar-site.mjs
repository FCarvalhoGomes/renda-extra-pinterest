import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, "config.json"), "utf8"));
const produtos = JSON.parse(await fs.readFile(path.join(root, "dados-pinterest.json"), "utf8"));
const outDir = path.join(root, "produto");
await fs.mkdir(outDir, { recursive: true });

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const slugify = (text = "") => String(text)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const slug = (produto) => slugify(produto.arquivo.replace(/\.[^.]+$/, ""));
const canonical = (produto) => `${config.siteUrl}/produto/${slug(produto)}.html`;
const imageUrl = (produto) => `https://raw.githubusercontent.com/${config.githubUser}/${config.repository}/${config.branch}/pins/${encodeURIComponent(produto.arquivo)}`;

function layout({ title, description, canonicalUrl, content }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonicalUrl)}">
  <link rel="stylesheet" href="${canonicalUrl === config.siteUrl + "/" ? "styles.css" : "../styles.css"}">
</head>
<body>
  <header><a href="${config.siteUrl}/">${esc(config.siteName)}</a><span>indicações objetivas para comprar melhor</span></header>
  <main>${content}</main>
  <footer>Alguns links são de afiliado. Podemos receber comissão sem custo extra para você.</footer>
</body>
</html>`;
}

const card = (produto) => `
  <article class="card">
    <a href="produto/${slug(produto)}.html"><img src="pins/${esc(produto.arquivo)}" alt="${esc(produto.titulo)}" loading="lazy"></a>
    <div><small>${esc(produto.board || config.board)}</small><h2><a href="produto/${slug(produto)}.html">${esc(produto.titulo)}</a></h2><p>${esc(produto.textoArte)}</p><a class="link" href="produto/${slug(produto)}.html">Ver análise</a></div>
  </article>`;

const grupos = ["Setup Home Office", "Casa e Decoração", "Roteadores"];
const sections = grupos.map((grupo) => {
  const itens = produtos.filter((produto) => (produto.board || config.board) === grupo);
  const id = slugify(grupo);
  return `<section class="group" id="${id}"><h2 class="group-title">${esc(grupo)}</h2><div class="grid">${itens.map(card).join("")}</div></section>`;
}).join("");

const home = layout({
  title: `${config.siteName} | Casa, tecnologia e produtividade`,
  description: "Seleção de produtos para casa, tecnologia e produtividade com pontos práticos para conferir antes da compra.",
  canonicalUrl: `${config.siteUrl}/`,
  content: `<section class="hero"><p class="eyebrow">GUIAS DE COMPRA</p><h1>Produtos úteis, com o que conferir antes de comprar</h1><p>Seleções diretas para casa, tecnologia e produtividade.</p><nav class="group-nav">${grupos.map((grupo) => `<a href="#${slugify(grupo)}">${esc(grupo)}</a>`).join("")}</nav></section>${sections}`
});
await fs.writeFile(path.join(root, "index.html"), home, "utf8");

for (const produto of produtos) {
  const bullets = produto.beneficios.map((item) => `<li>${esc(item)}</li>`).join("");
  const alt = produto.linkAlternativo ? `<a class="secondary" href="${esc(produto.linkAlternativo)}" rel="nofollow sponsored">Ver opção alternativa</a>` : "";
  const offer = produto.linkPendente
    ? `<p class="pending">Link individual deste produto em atualização.</p>`
    : `<a class="button" href="${esc(produto.link)}" rel="nofollow sponsored">${esc(produto.cta)}</a>${alt}`;
  const content = `<article class="product">
    <a class="back" href="${config.siteUrl}/">← Voltar às indicações</a>
    <div class="product-grid">
      <img src="../pins/${esc(produto.arquivo)}" alt="${esc(produto.titulo)}">
      <div><p class="eyebrow">${esc(produto.board || config.board)}</p><h1>${esc(produto.titulo)}</h1><p class="lead">${esc(produto.descricao.replace(/\s*Publicidade:.*$/i, ""))}</p><h2>Pontos principais</h2><ul>${bullets}</ul><p class="check">Confirme preço, modelo, medidas, garantia e itens incluídos diretamente no anúncio.</p>${offer}<p class="disclosure">Publicidade: esta página pode conter link de afiliado.</p></div>
    </div>
  </article>`;
  await fs.writeFile(path.join(outDir, `${slug(produto)}.html`), layout({ title: produto.titulo, description: produto.descricao, canonicalUrl: canonical(produto), content }), "utf8");
}

const urls = [`${config.siteUrl}/`, ...produtos.map(canonical)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${esc(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
await fs.writeFile(path.join(root, "sitemap.xml"), sitemap, "utf8");
await fs.writeFile(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`, "utf8");
console.log(`Site gerado: ${produtos.length} páginas de produto + página inicial.`);
