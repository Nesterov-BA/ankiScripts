async function ankiConnectInvoke(action, version, params = {}) {
  const response = await fetch("http://127.0.0.1:8765", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version, params }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw data.error;
  }
  if (!data.hasOwnProperty("result")) {
    throw new Error("failed to get results from AnkiConnect");
  }
  return data.result;
}

async function listKanji() {
  try {
    const result = await ankiConnectInvoke("findNotes", 5, {
      query: "deck:Kanji",
    });

    const notesInfo = await ankiConnectInvoke("notesInfo", 5, {
      notes: result,
    });
    res = {};
    for (const note of notesInfo) {
      res[note.fields.Kanji.value] = {
        on_readings: note.fields.Onyomi.value,
        kun_readings: note.fields.Kunyomi.value,
        meanings: htmlGlossaryToJsonRegex(note.fields.English.value),
      };
      // res.push()
    }
    return res;
  } catch (e) {
    console.log(`error getting decks: ${e}`);
  }
}

function htmlGlossaryToJsonRegex(htmlString) {
  // Try to match <li> elements first
  const liRegex = /<li>(.*?)<\/li>/g;
  const liMatches = [...htmlString.matchAll(liRegex)];

  if (liMatches.length > 0) {
    return liMatches.map((match) => match[1].trim());
  }

  // Fallback: extract text between > and < of the glossary div
  const singleRegex = /class="yomitan-glossary"[^>]*>([^<]*)<\/div>/;
  const singleMatch = htmlString.match(singleRegex);

  if (singleMatch && singleMatch[1].trim()) {
    return [singleMatch[1].trim()];
  }

  return htmlString;
}

(async () => {
  try {
    const kanjiDict = await listKanji();
    const fs = require("fs");
    const jsonString = JSON.stringify(kanjiDict, null, 2);
    const oldData = fs.readFileSync("kanji.json", "utf8");
    old_kanji = JSON.parse(oldData);
    fs.writeFileSync("kanji.json", jsonString, "utf8");
    console.log("kanji.json saved!");
    console.log(
      "Added",
      Object.keys(kanjiDict).length - Object.keys(old_kanji).length,
      "kanji",
    );
    console.log("Found", Object.keys(kanjiDict).length, "kanji");
  } catch (e) {
    console.error(`error finding kanji: ${e}`);
  }
})();
