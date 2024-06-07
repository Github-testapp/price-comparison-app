const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../client/build")));

app.get("/api/search", async (req, res) => {
  const { term, minPrice, maxPrice } = req.query;
  let results = [];

  const amazonData = await scrapeAmazon(term, minPrice, maxPrice);
  results = results.concat(amazonData);

  const terms = term.split(" ").map((t) => t.toLowerCase());
  const filteredResults = results
    .filter((item) => terms.every((t) => item.name.toLowerCase().includes(t)))
    .sort((a, b) => b.price - a.price);

  res.json(filteredResults);
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

async function scrapeAmazon(term, minPrice, maxPrice) {
  const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(term)}`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  let results = [];

  $(".s-main-slot .s-result-item").each((index, element) => {
    const name = $(element).find("h2 .a-link-normal").text().trim();
    const priceText = $(element)
      .find(".a-price .a-offscreen")
      .text()
      .replace("￥", "")
      .replace(",", "");
    const priceValue = parseInt(priceText, 10);
    const link =
      "https://www.amazon.co.jp" +
      $(element).find("h2 .a-link-normal").attr("href");

    if (priceValue && priceValue >= minPrice && priceValue <= maxPrice) {
      results.push({ name, price: priceValue, source: "Amazon", link });
    }
  });

  return results;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
