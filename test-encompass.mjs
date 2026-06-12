import { gotScraping } from 'got-scraping';
import { load } from 'cheerio';

function parseRows(html) {
  const $ = load(html);
  const rows = [];

  $("tr").each((_, tr) => {
    const cells = $(tr).find("td,th").toArray();
    if (cells.length < 5) return;

    const headerText = cells.slice(0, 3).map((cell) => $(cell).text().trim()).join(" ");
    if (/Part Number|Part Title/i.test(headerText)) return;

    const partNumber = $(cells[1]).text().trim();
    if (!partNumber || partNumber.length < 3) return;

    const titleLines = $(cells[2]).text().split(/\n|(?=Schematic Location:)/).map((line) => line.trim()).filter(Boolean);
    let diagramId = "";
    const description = [];

    for (const line of titleLines) {
      const schematic = line.match(/Schematic Location:\s*(\S+)/i);
      if (schematic) {
        diagramId = schematic[1] ?? "";
        continue;
      }
      if (/^Skill Level/i.test(line)) continue;
      description.push(line);
    }

    const priceText = $(cells[4]).text().trim();
    const availability = cells[5] ? $(cells[5]).text().trim() : "";
    const price = priceText || (/no longer available|discontinued|nla/i.test(availability) ? "NLA" : "");

    rows.push({
      part_number: partNumber,
      diagram_id: diagramId,
      description: description.join(" "),
      encompass_price: price
    });
  });

  return rows;
}

(async () => {
  try {
    const urls = ['https://encompass.com/model/WHIMEDC465HW0', 'https://encompass.com/model/MAYMEDC465HW0'];
    for (const url of urls) {
      console.log('Fetching', url);
      const res = await gotScraping({ url, headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 110 }] } });
      console.log('Status:', res.statusCode);
      if (/Model is not valid for this site/i.test(res.body)) {
         console.log('Regex "Model is not valid" MATCHED.');
      } else {
         console.log('Page loaded successfully! Length:', res.body.length);
         const rows = parseRows(res.body);
         console.log('Rows parsed:', rows.length);
      }
    }
  } catch (err) {
    console.error('Error:', err.message, err.response?.statusCode);
  }
})();
