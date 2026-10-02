import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, "config.json"), "utf8"));
const produtos = JSON.parse(await fs.readFile(path.join(root, "dados-pinterest.json"), "utf8"));
const pinsDir = path.join(root, "pins");
await fs.mkdir(pinsDir, { recursive: true });

const escapeXml = (text = "") => String(text)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&apos;");

const csv = (value = "") => `"${String(value).replaceAll('"', '""')}"`;

const slugify = (text = "") => String(text)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function wrap(text, max = 26) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function textLines(lines, x, y, size, gap, weight = 700, color = "#123D2B") {
  return lines.map((line, i) => `<text x="${x}" y="${y + i * gap}" font-size="${size}" font-weight="${weight}" fill="${color}" font-family="Arial, sans-serif">${escapeXml(line)}</text>`).join("");
}

if (config.githubUser === "SEU_USUARIO_GITHUB") {
  console.error("Abra config.json e informe seu usuário do GitHub antes de gerar o CSV.");
  process.exit(1);
}

const missing = [];
for (const produto of produtos) {
  const photoPath = path.join(root, produto.foto);
  try { await fs.access(photoPath); } catch { missing.push(produto.foto); }
}
if (missing.length) {
  console.error("Faltam estas fotos:\n" + missing.map(x => `- ${x}`).join("\n"));
  process.exit(1);
}

const csvRows = [["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"]];

for (const produto of produtos) {
  const title = wrap(produto.textoArte, 25);
  const photoPath = path.join(root, produto.foto);
  const outputPath = path.join(pinsDir, produto.arquivo);
  const metadata = await sharp(photoPath).metadata();
  const isReadyPin = metadata.width && metadata.height && Math.abs((metadata.width / metadata.height) - (2 / 3)) < 0.02;

  if (isReadyPin) {
    await sharp(photoPath).rotate().resize(1000, 1500, { fit: "cover" }).png().toFile(outputPath);
  } else {
    const photo = await sharp(photoPath).rotate().resize(840, 690, { fit: "contain", background: "#FFFFFF" }).png().toBuffer();
    const svg = `
  <svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="1500" fill="#F7F6EF"/>
    <rect x="0" y="0" width="1000" height="18" fill="#B7D83D"/>
    <text x="80" y="82" font-size="24" font-weight="700" letter-spacing="3" fill="#59711C" font-family="Arial, sans-serif">TUDO TECH  •  DICAS</text>
    ${textLines(title, 80, 165, 62, 72)}
    <rect x="80" y="350" width="840" height="690" rx="34" fill="#FFFFFF"/>
    <rect x="80" y="1075" width="840" height="145" rx="28" fill="#EAF2D1"/>
    ${produto.beneficios.map((b, i) => `<circle cx="120" cy="${1115 + i * 38}" r="8" fill="#7AA21D"/><text x="145" y="${1124 + i * 38}" font-size="28" fill="#25342D" font-family="Arial, sans-serif">${escapeXml(b)}</text>`).join("")}
    <rect x="80" y="1260" width="840" height="105" rx="52" fill="#123D2B"/>
    <text x="500" y="1328" text-anchor="middle" font-size="36" font-weight="700" fill="#FFFFFF" font-family="Arial, sans-serif">${escapeXml(produto.cta)}</text>
    <text x="80" y="1432" font-size="20" fill="#59635F" font-family="Arial, sans-serif">Publicidade • link de afiliado</text>
  </svg>`;
    await sharp(Buffer.from(svg)).composite([{ input: photo, left: 80, top: 350 }]).png().toFile(outputPath);
  }

  const mediaUrl = `https://raw.githubusercontent.com/${config.githubUser}/${config.repository}/${config.branch}/pins/${encodeURIComponent(produto.arquivo)}`;
  const destination = config.useSiteLinks
    ? `${config.siteUrl}/produto/${slugify(produto.arquivo.replace(/\.[^.]+$/, ""))}.html`
    : produto.link;
  csvRows.push([produto.titulo, mediaUrl, produto.board || config.board, "", produto.descricao, destination, config.publishDate, produto.keywords]);
}

const csvText = "\uFEFF" + csvRows.map(row => row.map(csv).join(",")).join("\r\n");
let csvName = "pinterest-upload.csv";
try {
  await fs.writeFile(path.join(root, csvName), csvText, "utf8");
} catch (error) {
  if (error?.code !== "EBUSY") throw error;
  csvName = "pinterest-upload-atualizado.csv";
  await fs.writeFile(path.join(root, csvName), csvText, "utf8");
}
console.log(`Pronto: ${produtos.length} imagens em pins/ e ${csvName} gerado.`);
