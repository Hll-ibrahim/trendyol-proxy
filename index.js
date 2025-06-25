const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3001;

// Tek bir fonksiyonla veri çekme
async function fetchReviewPage(params) {
  const url = `https://apigw.trendyol.com/discovery-web-websfxsocialreviewrating-santral/product-reviews-detailed?${params.toString()}`;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    accept: 'application/json, text/plain, */*',
    origin: 'https://www.trendyol.com',
    referer: 'https://www.trendyol.com/',
  });

  await page.goto(url, { waitUntil: 'networkidle2' });
  const bodyText = await page.evaluate(() => document.body.innerText);
  await browser.close();

  try {
    const json = JSON.parse(bodyText);
    if (json.result?.productReviews?.content?.length > 0) {
      return json;
    }
  } catch (_) {}

  return null;
}

// Ana route
app.get('/trendyol', async (req, res) => {
  const { sellerId, contentId, page, merchantId, boutiqueId } = req.query;

  if (!page) {
    return res.status(400).json({ error: 'Eksik page parametresi' });
  }

  // İlk yöntem: sellerId + contentId birlikte varsa dene
  if (sellerId && contentId) {
    const firstParams = new URLSearchParams({
      page,
      order: 'DESC',
      orderBy: 'Score',
      channelId: '1',
      sellerId,
      contentId,
    });

    const firstTry = await fetchReviewPage(firstParams);
    if (firstTry) {
      return res.json({ method: 'sellerId+contentId', data: firstTry });
    }
  }

  // İkinci yöntem: merchantId + boutiqueId birlikte varsa dene
  if (merchantId && boutiqueId) {
    const secondParams = new URLSearchParams({
      page,
      order: 'DESC',
      orderBy: 'Score',
      channelId: '1',
      merchantId,
      boutiqueId,
    });

    const secondTry = await fetchReviewPage(secondParams);
    if (secondTry) {
      return res.json({ method: 'merchantId+boutiqueId', data: secondTry });
    }
  }

  // Hiçbir kombinasyon işe yaramadıysa
  return res.status(404).json({ error: 'Veri bulunamadı. Uygun parametre kombinasyonu başarısız oldu.' });
});

app.listen(PORT, () => {
  console.log(`Proxy çalışıyor: http://localhost:${PORT}/trendyol`);
});
