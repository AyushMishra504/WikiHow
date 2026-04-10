const express = require('express');


const router = express.Router();

router.get('/getData/:title', async (req, res) => {
  const topic = req.params.title;

  if (!topic) {
    return res.status(400).json({ error: "Topic required" });
  }

  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|links|pageimages&titles=${encodeURIComponent(topic)}&pllimit=20&plnamespace=0&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=400`;
    const response = await fetch(url);
    const data = await response.json();

    const pages = data.query.pages;
    const page = Object.values(pages)[0];

    if (!page || page.missing) {
      return res.status(404).json({ error: "Page not found" });
    }

    // Filter out meta/namespace links and limit to 6 content articles
    const links = (page.links || [])
      .map((link) => link.title)
      .filter((title) => !title.includes(":"))
      .slice(0, 6);

    const pageData = {
        title: page.title,
        extract: page.extract,
        image: page.thumbnail?.source,
    };
    res.status(200).json({ pageData, links });
  } catch (err) {
    console.error("Wiki fetch error:", err);
    res.status(500).json({ error: "Failed to fetch" });
  }
});

module.exports = router;    