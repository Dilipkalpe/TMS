/**
 * Builds docs/TMS-Pro-Workflows.docx from docs/WORKFLOWS.md
 * Renders Mermaid flowcharts via Kroki.io and embeds PNGs with Pandoc.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcMd = path.join(root, 'docs', 'WORKFLOWS.md')
const outDir = path.join(root, 'docs', 'flowcharts')
const outDocx = path.join(root, 'docs', 'TMS-Pro-Workflows.docx')
const tempMd = path.join(root, 'docs', 'WORKFLOWS-build.md')

async function renderMermaidPng(source, outPath) {
  const res = await fetch('https://kroki.io/mermaid/png', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: source,
  })
  if (!res.ok) throw new Error(`Kroki HTTP ${res.status}`)
  fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()))
}

const md = fs.readFileSync(srcMd, 'utf8')
fs.mkdirSync(outDir, { recursive: true })

const mermaidRegex = /```mermaid\r?\n([\s\S]*?)```/g
let idx = 0
let buildMd = md

for (const match of md.matchAll(mermaidRegex)) {
  idx += 1
  const name = `flowchart-${String(idx).padStart(2, '0')}`
  const pngPath = path.join(outDir, `${name}.png`)
  const title = name.replace(/-/g, ' ')

  try {
    await renderMermaidPng(match[1].trim(), pngPath)
    buildMd = buildMd.replace(match[0], `\n### Diagram: ${title}\n\n![${title}](./flowcharts/${name}.png)\n`)
    console.log(`Rendered ${name}.png`)
  } catch (err) {
    console.warn(`Skip ${name}: ${err.message}`)
    buildMd = buildMd.replace(match[0], `\n### Diagram: ${title}\n\n\`\`\`\n${match[1].trim()}\n\`\`\`\n`)
  }
}

fs.writeFileSync(tempMd, buildMd, 'utf8')

execSync(
  `pandoc "${tempMd}" -o "${outDocx}" --from markdown --to docx --resource-path="${path.join(root, 'docs')}" --toc --toc-depth=2`,
  { cwd: root, stdio: 'inherit' },
)

console.log(`\nCreated: ${outDocx}`)
