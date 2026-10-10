import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const source = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-secrets.mjs")
function fixture(run) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "foodguard-secret-test-"))
  const git = (...args) => execFileSync("git", ["-c", `safe.directory=${directory.replaceAll("\\", "/")}`, ...args], { cwd: directory, stdio: "pipe" })
  try {
    mkdirSync(path.join(directory, "scripts"))
    copyFileSync(source, path.join(directory, "scripts/check-secrets.mjs"))
    git("init", "--quiet")
    git("config", "user.name", "Test")
    git("config", "user.email", "test@example.invalid")
    const write = (filename, contents) => writeFileSync(path.join(directory, filename), contents)
    const scan = (...args) => spawnSync(process.execPath, ["scripts/check-secrets.mjs", ...args], { cwd: directory, encoding: "utf8" })
    run({ git, write, scan })
  } finally {
    const resolved = path.resolve(directory)
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
    assert.ok(path.basename(resolved).startsWith("foodguard-secret-test-"))
    rmSync(resolved, { recursive: true, force: true })
  }
}

test("clean source and environment examples pass", () => fixture(({ write, scan }) => {
  write(".env.example", "VITE_FOODGUARD_API_URL=http://127.0.0.1:8787\n")
  write("app.txt", "Users supply their own API Key.\n")
  const result = scan()
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout).findings, [])
}))

test("common secret formats fail without exposing their values", () => fixture(({ write, scan }) => {
  const key = "sk-" + "a".repeat(40)
  const token = "github_pat_" + "b".repeat(70)
  write("leak.txt", `${key}\n${token}`)
  const result = scan()
  assert.equal(result.status, 1)
  assert.ok(JSON.parse(result.stdout).findings.some(item => item.file === "leak.txt"))
  assert.ok(!result.stdout.includes(key) && !result.stdout.includes(token))
}))

test("ignored local credential is checked against public files", () => fixture(({ write, scan }) => {
  const key = "test-local-secret-" + "c".repeat(30)
  write(".gitignore", ".env.server.local\n")
  write(".env.server.local", `OPENAI_API_KEY=${key}\n`)
  write("leak.txt", key)
  const result = scan()
  assert.equal(result.status, 1)
  assert.ok(JSON.parse(result.stdout).findings.some(item => item.rule === "local credential match"))
  assert.ok(!result.stdout.includes(key))
}))

test("removed secrets in committed history are still detected", () => fixture(({ git, write, scan }) => {
  const key = "sk-" + "d".repeat(40)
  write("past.txt", key)
  git("add", "past.txt")
  git("commit", "--quiet", "-m", "Synthetic leak")
  write("past.txt", "removed")
  git("add", "past.txt")
  git("commit", "--quiet", "-m", "Synthetic cleanup")
  assert.equal(scan().status, 0)
  const result = scan("--history")
  assert.equal(result.status, 1)
  assert.ok(JSON.parse(result.stdout).findings.some(item => item.file.startsWith("history:past.txt@")))
  assert.ok(!result.stdout.includes(key))
}))
