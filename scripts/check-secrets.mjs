import { execFileSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const git = (...args) => execFileSync("git", ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, ...args], {
  cwd: root, maxBuffer: 64 * 1024 * 1024,
})
const rules = [
  ["API key", /\bsk-[A-Za-z0-9_-]{24,}/g],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ["JWT credential", /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g],
]
const known = new Set()
// Compare locally stored secrets without writing or printing their values.
for (const filename of [".env.local", ".env.server.local", ".env"]) {
  const file = path.join(root, filename)
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z_0-9]*)\s*=\s*(.*)$/)
    if (!match || !/KEY|TOKEN|PASSWORD|SECRET/.test(match[1])) continue
    const value = match[2].trim().replace(/^['"]|['"]$/g, "")
    if (value.length >= 12 && !/^(?:your_|example|placeholder)/i.test(value)) known.add(value)
  }
}
const findings = []
function inspect(label, buffer) {
  const content = buffer.toString("utf8")
  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0
    if (pattern.test(content)) findings.push({ file: label, rule: name })
  }
  if ([...known].some(value => buffer.includes(Buffer.from(value)))) findings.push({ file: label, rule: "local credential match" })
}
const files = [...new Set(git("ls-files", "-z", "--cached", "--others", "--exclude-standard").toString("utf8").split("\0").filter(Boolean))]
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && ![".env.example", ".env.server.example"].includes(file)) findings.push({ file, rule: "environment file tracked or unignored" })
  if (/\.(?:pem|key|p12|pfx|jks|keystore)$|(^|\/)(?:id_rsa|id_ed25519|local\.properties|key\.properties|signing\.properties|google-services\.json)(?:$|\.)/i.test(file)) findings.push({ file, rule: "private configuration tracked or unignored" })
  if (existsSync(path.join(root, file))) inspect(file, readFileSync(path.join(root, file)))
}
let historyBlobs = 0
if (process.argv.includes("--history")) {
  for (const object of git("rev-list", "--objects", "--all").toString("utf8").trim().split(/\r?\n/)) {
    const space = object.indexOf(" ")
    if (space < 0) continue
    const id = object.slice(0, space)
    if (git("cat-file", "-t", id).toString().trim() !== "blob") continue
    inspect(`history:${object.slice(space + 1)}@${id.slice(0, 8)}`, git("cat-file", "blob", id))
    historyBlobs++
  }
}
console.log(JSON.stringify({ files: files.length, history_blobs: historyBlobs, findings }, null, 2))
if (findings.length) process.exitCode = 1
