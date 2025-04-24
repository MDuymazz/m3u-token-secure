export default {
  async fetch(request) {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")
    const expires = url.searchParams.get("expires")
    const ip = request.headers.get("cf-connecting-ip")

    const users = await fetchUsers()

    const user = users.find(u => u.ip === ip && u.expires > Date.now() / 1000)

    if (!user) {
      return new Response("Erişim reddedildi", { status: 403 })
    }

    const raw = `${ip}-${expires}-${user.secret}`
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
    const expectedToken = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("")

    if (token !== expectedToken) {
      return new Response("Geçersiz token", { status: 403 })
    }

    const githubUrl = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u"

    try {
      const response = await fetch(githubUrl)
      const m3u = await response.text()
      return new Response(m3u, {
        headers: { "Content-Type": "application/x-mpegURL" }
      })
    } catch (e) {
      return new Response("Dosya yüklenemedi", { status: 500 })
    }
  }
}

async function fetchUsers() {
  const res = await fetch("https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/main/users.json")
  return await res.json()
}

