// GHCR 镜像版本清理（GitHub Actions 专用）：只保留当次推送的标签版本，其余全部删除。
// 保留规则：含 latest / 当前版本号 / 当前 sha 标签的版本。
//
// 环境变量：GITHUB_TOKEN、PACKAGE（容器包名，如 delta-force）、KEEP_TAGS（逗号分隔）

const token = process.env.GITHUB_TOKEN
const pkg = process.env.PACKAGE
const keepTags = new Set((process.env.KEEP_TAGS ?? '').split(',').filter(Boolean))

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
  if (!token || !pkg || keepTags.size === 0) throw new Error('缺少 GITHUB_TOKEN / PACKAGE / KEEP_TAGS')
  const versions = await api(`/user/packages/container/${pkg}/versions?per_page=100`)
  if (!Array.isArray(versions)) throw new Error(`意外的响应：${JSON.stringify(versions).slice(0, 200)}`)
  let deleted = 0
  for (const v of versions) {
    const tags = v.metadata?.container?.tags ?? []
    if (tags.some((t) => keepTags.has(t))) continue
    await api(`/user/packages/container/${pkg}/versions/${v.id}`, { method: 'DELETE' })
    console.log(`已删除镜像版本 ${v.id}（标签：${tags.join(', ') || '无'}）`)
    deleted++
  }
  console.log(`清理完成：删除 ${deleted} 个旧版本，保留标签 ${[...keepTags].join(', ')}`)
}

main().catch((err) => {
  console.error(`GHCR 清理失败：${err.message}`)
  process.exit(1)
})
