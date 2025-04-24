const M3U_URL = 'https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u'; // M3U dosyasının linki
const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json"; // Kullanıcı JSON dosyası

// M3U dosyasını almak için fetch işlemi
async function fetchM3U() {
  const response = await fetch(M3U_URL);
  const data = await response.text(); // M3U içeriğini metin olarak alıyoruz
  return data;
}

// Kullanıcı doğrulaması ve token kontrolü
async function handleRequest(request) {
  const url = new URL(request.url);
  const ip = request.headers.get("CF-Connecting-IP"); // Kullanıcının IP adresini alıyoruz
  const key = url.searchParams.get("key"); // URL'deki key parametresini alıyoruz

  // Eğer key veya IP yoksa, hata döndür
  if (!key || !ip) {
    return new Response("IP veya key bulunamadı!", { status: 400 });
  }

  // Kullanıcıları yükle
  const usersResponse = await fetch(usersUrl);
  const usersData = await usersResponse.json();

  // IP'yi ve key'i doğrula
  const user = usersData[ip];

  if (!user || user.secret_key !== key) {
    return new Response("Geçersiz key veya IP!", { status: 403 });
  }

  // Token'ın geçerlilik süresi dolmadığını kontrol et
  const currentDate = new Date();
  const expireDate = new Date(user.expire_date);

  if (currentDate > expireDate) {
    return new Response("Token süresi dolmuş!", { status: 403 });
  }

  // Her şey geçerliyse M3U dosyasını çekme ve kullanıcılara sunma
  const m3uContent = await fetchM3U();

  // M3U içeriğini doğru Content-Type ile geri döndürüyoruz
  return new Response(m3uContent, {
    headers: { "Content-Type": "application/x-mpegURL" } // M3U dosyasını geri döndürüyoruz
  });
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});
