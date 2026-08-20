// Release 清理（GitHub Actions 专用）：同一版本号前缀只保留最新一个 build，旧的自动删除。
// 例：android-v0.0.2-indoor-b1..b4 中只保留 b4。
//
// 环境变量：GITHUB_TOKEN、REPO（owner/repo）、KEEP_PREFIX（如 android-v0.0.2-indoor-b）

const token = process.env.GITHUB_TOKEN
const repo = process.env.REPO
const keepPrefix = process.env.KEEP_PREFIX

async function api(url, options = {}) {
  const res = await fetch(`https://api.github.com${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${url} → ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function main() {
  if (!token || !repo || !keepPrefix) throw new Error('缺少 GITHUB_TOKEN / REPO / KEEP_PREFIX')
  const releases = await api(`/repos/${repo}/releases?per_page=100`)
  // 同前缀的构建按创建时间排序，最新一个保留，其余删除（release + tag）
  const matched = releases
    .filter((r) => typeof r.tag_name === 'string' && r.tag_name.startsWith(keepPrefix))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const [, ...stale] = matched
  if (stale.length === 0) {
    console.log(`前缀 ${keepPrefix}* 共 ${matched.length} 个 release，无需清理`)
    return
  }
  for (const r of stale) {
    await api(`/repos/${repo}/releases/${r.id}`, { method: 'DELETE' })
    try {
      await api(`/repos/${repo}/git/refs/tags/${r.tag_name}`, { method: 'DELETE' })
    } catch {
      // 标签可能已不存在，忽略
    }
    console.log(`已删除旧构建 ${r.tag_name}`)
  }
}

main().catch((err) => {
  console.error(`Release 清理失败：${err.message}`)
  process.exit(1)
})
