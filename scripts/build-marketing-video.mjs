/**
 * Builds TMS Pro marketing video with smooth crossfades + voiceover
 * Run: npm run marketing:video
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const slidesDir = join(root, 'marketing', 'slides')
const outDir = join(root, 'marketing')
const outFile = join(outDir, 'TMS-Pro-Marketing.mp4')
const tempVideo = join(outDir, '_temp-video.mp4')
const narrationWav = join(outDir, 'TMS-Pro-Marketing-narration.wav')

const FADE_SEC = 1.2
const FPS = 30

const slides = [
  ['tms-marketing-hero.png', 5.5],
  ['tms-marketing-bookings.png', 5.5],
  ['tms-marketing-fleet.png', 5.5],
  ['modules-diagram.png', 4.5],
  ['tms-marketing-finance.png', 5.5],
  ['tms-marketing-cta.png', 7],
]

function resolveFfmpeg() {
  const where = spawnSync('where.exe', ['ffmpeg'], { encoding: 'utf8', shell: true })
  if (where.status === 0 && where.stdout.trim()) {
    const path = where.stdout.trim().split(/\r?\n/)[0]
    const check = spawnSync(path, ['-filters'], { encoding: 'utf8' })
    if (check.stdout?.includes('xfade')) return path
  }
  return ffmpegInstaller.path
}

function buildFilterGraph() {
  const scale = slides.map((_, i) =>
    `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#0f172a,setsar=1,format=yuv420p,fps=${FPS}[v${i}]`,
  )

  let cumulative = slides[0][1]
  let prev = 'v0'
  const xfades = []

  for (let i = 1; i < slides.length; i++) {
    const out = i === slides.length - 1 ? 'outv' : `x${i}`
    const offset = cumulative - FADE_SEC
    xfades.push(
      `[${prev}][v${i}]xfade=transition=fade:duration=${FADE_SEC}:offset=${offset.toFixed(3)}[${out}]`,
    )
    cumulative += slides[i][1] - FADE_SEC
    prev = out
  }

  return `${scale.join(';')};${xfades.join(';')}`
}

function totalVideoDuration() {
  return slides.reduce((sum, [, d]) => sum + d, 0) - (slides.length - 1) * FADE_SEC
}

const ffmpeg = resolveFfmpeg()

for (const [name] of slides) {
  const p = join(slidesDir, name)
  if (!existsSync(p)) {
    console.error(`Missing slide: ${p}`)
    process.exit(1)
  }
}

mkdirSync(outDir, { recursive: true })

console.log('Generating voiceover...')
const audioScript = join(root, 'scripts', 'generate-marketing-audio.ps1')
const ps = spawnSync(
  'powershell',
  ['-ExecutionPolicy', 'Bypass', '-File', audioScript],
  { stdio: 'inherit', cwd: root },
)
if (ps.status !== 0 || !existsSync(narrationWav)) {
  console.error('Voiceover generation failed')
  process.exit(1)
}

const videoDuration = totalVideoDuration()
console.log(`Using ffmpeg: ${ffmpeg}`)
console.log(`Smooth crossfade: ${FADE_SEC}s between slides (~${videoDuration.toFixed(1)}s video)`)

const args = ['-y']
for (const [name, duration] of slides) {
  args.push('-loop', '1', '-t', String(duration), '-i', join(slidesDir, name))
}

args.push('-filter_complex', buildFilterGraph())
args.push('-map', '[outv]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', tempVideo)

console.log('Building video with smooth transitions...')
let result = spawnSync(ffmpeg, args, { stdio: 'inherit', cwd: root })
if (result.status !== 0) {
  console.error('Video encode failed')
  process.exit(result.status ?? 1)
}

console.log('Mixing voiceover...')
const outputDuration = Math.max(videoDuration, 28)
result = spawnSync(
  ffmpeg,
  [
    '-y',
    '-i', tempVideo,
    '-i', narrationWav,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-af', 'volume=1.1',
    '-t', String(outputDuration),
    '-movflags', '+faststart',
    outFile,
  ],
  { stdio: 'inherit', cwd: root },
)

try { unlinkSync(tempVideo) } catch { /* ignore */ }

if (result.status !== 0) {
  console.error('Audio mux failed')
  process.exit(result.status ?? 1)
}

console.log('\nDone:', outFile)
console.log('Website: https://codeestack.vercel.app')
console.log('Contact: 9923262489')
