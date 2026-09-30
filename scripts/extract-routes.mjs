import fs from 'fs'

const src = fs.readFileSync('src/App.jsx', 'utf8')
const lines = src.split(/\n/)
const routes = []
for (const line of lines) {
  const pm = line.match(/path=["']([^"']+)["']/)
  const el = line.match(/element=\{<(\w+)/)
  if (line.includes('<Route index') && el) {
    routes.push({ path: '(index under parent)', component: el[1] })
  } else if (pm && el) {
    routes.push({ path: pm[1], component: el[1] })
  } else if (pm && line.includes('Navigate')) {
    const to = line.match(/to=["']([^"']+)["']/)
    routes.push({ path: pm[1], component: `Navigate→${to?.[1] || '?'}` })
  }
}
console.log(JSON.stringify({ count: routes.length, routes }, null, 2))
