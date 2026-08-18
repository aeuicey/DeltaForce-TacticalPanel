// AI 代码质量审查（GitHub Actions 专用）
// 通过 DeepSeek API（OpenAI 兼容协议）对 diff 做审查，结果以评论形式回写到 PR 或 commit。
//
// 用法（环境变量驱动）：
//   DEEPSEEK_API_KEY  - DeepSeek API Key（仓库 Secrets 注入）
//   REPO              - owner/repo
//   PR_NUMBER         - PR 编号（评论到 PR）；与 COMMIT_SHA 二选一
//   COMMIT_SHA        - commit SHA（评论到 commit）
//   DIFF_FILE         - diff 文本文件路径
//   MODEL             - 可选，默认 deepseek-chat
//   API_BASE          - 可选，默认 https://api.deepseek.com/chat/completions

const fs = require('node:fs')

const apiKey = process.env.DEEPSEEK_API_KEY
const githubToken = process.env.GITHUB_TOKEN
const repo = process.env.REPO
const prNumber = process.env.PR_NUMBER
const commitSha = process.env.COMMIT_SHA
const diffFile = process.env.DIFF_FILE || '/tmp/ai-review.diff'
const model = process.env.MODEL || 'deepseek-chat'
const apiBase = process.env.API_BASE || 'https://api.deepseek.com/chat/completions'

const MAX_DIFF_CHARS = 24000

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${url} → ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

async function main() {
  if (!apiKey) throw new Error('缺少 DEEPSEEK_API_KEY（请在仓库 Settings → Secrets 中添加）')
  if (!githubToken || !repo) throw new Error('缺少 GITHUB_TOKEN 或 REPO')
  let diff = fs.existsSync(diffFile) ? fs.readFileSync(diffFile, 'utf8') : ''
  if (!diff.trim()) {
    console.log('diff 为空，跳过审查')
    return
  }
  let truncated = false
  if (diff.length > MAX_DIFF_CHARS) {
    diff = diff.slice(0, MAX_DIFF_CHARS)
    truncated = true
  }

  const prompt = [
    '你是一名资深代码审查工程师。请审查以下 git diff，用简体中文输出代码质量审查意见。',
    '要求：',
    '1. 先给一句总体评价（质量等级：良好/一般/需改进）。',
    '2. 按严重程度列出具体问题（阻断/严重/建议），每条注明文件与大致位置、问题描述、修改建议；没有问题就明确说"未发现明显问题"。',
    '3. 重点关注：真实 bug、空指针/边界条件、异步与并发、资源泄漏、安全风险、明显的性能问题。',
    '4. 不要逐行复述改动，不要客套话，总长度控制在 600 字以内。',
    truncated ? '（注意：diff 过长已截断，审查基于可见部分。）' : '',
    '',
    '```diff',
    diff,
    '```',
  ].join('\n')

  const res = await fetch(apiBase, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是严谨务实的资深代码审查工程师，只输出审查结论。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek API → ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const completion = await res.json()
  const review = completion.choices?.[0]?.message?.content?.trim() || '（模型未返回内容）'
  const body = `## 🤖 AI 代码审查（${model}）\n\n${review}\n\n---\n*由 GitHub Actions 自动生成，仅供参考。*`

  if (prNumber) {
    await api(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    console.log(`已评论到 PR #${prNumber}`)
  } else if (commitSha) {
    await api(`https://api.github.com/repos/${repo}/commits/${commitSha}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    console.log(`已评论到 commit ${commitSha}`)
  } else {
    console.log(body)
  }
}

main().catch((err) => {
  console.error(`AI 审查失败：${err.message}`)
  process.exit(1)
})
