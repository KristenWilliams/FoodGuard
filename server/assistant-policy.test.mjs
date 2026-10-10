import { test } from "node:test"
import assert from "node:assert/strict"
import { buildAssistantSystemPrompt } from "./assistant-policy.mjs"

test("Chinese assistant omits repetitive footers without weakening scope or uncertainty", () => {
  const prompt = buildAssistantSystemPrompt("zh")
  assert.match(prompt, /不要追加或重复/)
  assert.match(prompt, /不要沿用历史对话/)
  assert.match(prompt, /当前用户.*本机扫描历史/)
  assert.match(prompt, /拒绝任何无关闲聊/)
  assert.match(prompt, /具体证据限制仍须说明/)
  assert.match(prompt, /不能硬编结论/)
})

test("English assistant has the same reply policy", () => {
  const prompt = buildAssistantSystemPrompt("en")
  assert.match(prompt, /Do not append or repeat generic disclaimers/)
  assert.match(prompt, /previous conversation messages/)
  assert.match(prompt, /current user's provided scan history/)
  assert.match(prompt, /Refuse any unrelated/)
  assert.match(prompt, /Still clearly state specific evidence limitations/)
  assert.match(prompt, /never invent a conclusion/)
})
