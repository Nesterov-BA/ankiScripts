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
        kanji: note.fields.Kanji.value,
        id: note.noteId,
      };
    }
    return res;
  } catch (e) {
    console.log(`error getting decks: ${e}`);
  }
}

(async () => {
  // ✅ Wrap in async IIFE to use top-level await
  // const res = await findKanji("限");  // ✅ Await the async function
  try {
    const allKanji = await listKanji();
    console.log(allKanji);
    const tdqm = require(`tqdm`);
    const fs = require("fs");
    const stories_json = fs.readFileSync("kanji_bank_1.json", "utf8");
    stories = JSON.parse(stories_json);
    console.log(stories["来"][0][1]);
    kanjiNoExamples = [];
    console.log(allKanji["激"]);
    for (kanji of tdqm(Object.keys(allKanji))) {
      // console.log(kanji);
      out_str = "";
      if (stories[kanji] != undefined) {
        for (item of stories[kanji][0][1]["content"]["content"]) {
          if (item["tag"] == "span") {
            if (item["style"]["fontWeight"] == "bold") {
              out_str += "<b>" + item["content"] + "</b>";
            } else if (item["style"]["fontStyle"] == "italic") {
              out_str += "<i>" + item["content"] + "</i>";
            }
          } else {
            out_str += item;
          }
        }
        // console.log(out_str);
        // console.log(kanji["激"]);
        // console.log(stories[kanji.kanji]);
        const gavno1 = await ankiConnectInvoke("updateNoteFields", 5, {
          note: {
            id: allKanji[kanji].id,
            fields: {
              KoohiiStory1: out_str,
            },
          },
        });
      }
      // console.log(id)
    }
  } catch (e) {
    console.log(`error finding kanji: ${e}`);
  }
})();
