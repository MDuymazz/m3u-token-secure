const M3U_URL = 'https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u';
const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";

// M3U dosyasını almak için fetch işlemi
async function fetchM3U() {
  const response = await fetch(M3U_URL);
  const data = await response.text();
  return data;
}

// Kullanıcı doğrulaması ve token kontrolü
async function handleRequest(request) {
  const url = new URL(request.url);
  const ip = request.headers.get("CF-Connecting-IP");
  const key = url.searchParams.get("key");

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

  // M3U dosyasını işleme
  const m3uLines = m3uContent.split("\n");
  const channels = [];

  // M3U dosyasındaki her kanal için işlemi yap
  let currentChannel = null;
  m3uLines.forEach(line => {
    if (line.startsWith("#EXTINF")) {
      // Kanal bilgisi
      const channelInfo = line.split(",");
      
      // Kanal adı, logo ve açıklamaları kontrol et
      const channelDetails = channelInfo[0].match(/tvg-name="([^"]+)"/);
      const channelLogo = channelInfo[0].match(/tvg-logo="([^"]+)"/);
      const channelTitle = channelInfo[1]?.trim();
      
      // Varsayılan değerler atama (eğer kanal bilgisi eksikse)
      currentChannel = {
        name: channelDetails ? channelDetails[1] : "Unknown",
        logo: channelLogo ? channelLogo[1] : "",
        title: channelTitle ? channelTitle : "No Title", // Eğer başlık eksikse "No Title" kullan
      };
    } else if (line.startsWith("http")) {
      // Kanalın M3U8 linki
      if (currentChannel) {
        currentChannel.url = line.trim();
        channels.push(currentChannel);
        currentChannel = null;  // Kanalı bitirdik, sıradaki için boşalt
      }
    }
  });

  // IPTV uyumlu M3U dosyasını formatla
  let formattedM3U = "#EXTM3U\n";
  channels.forEach(channel => {
    formattedM3U += `#EXTINF:-1 tvg-name="${channel.name}" tvg-logo="${channel.logo}" group-title="Günlük Spor Akışı", ${channel.title}\n`;
    formattedM3U += `${channel.url}\n`;
  });

  // M3U formatında geri döndür
  return new Response(formattedM3U, {
    headers: { "Content-Type": "application/x-mpegURL" }
  });
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});
