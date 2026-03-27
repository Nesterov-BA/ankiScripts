
async function ankiConnectInvoke(action, version, params = {}) {
    const response = await fetch('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version, params })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    if (!data.hasOwnProperty('result')) {
        throw new Error('failed to get results from AnkiConnect');
    }
    return data.result;
}
/**
 * Extracts definition data from Yomitan-style HTML using string parsing only
 * @param {string} html - Raw HTML string
 * @returns {Array} Array of definition objects
 */
function extractYomitanDefinitions(html) {
  if (!html || typeof html !== 'string') return [];

  const results = [];

  // Helper: extract all matches of a pattern with content between tags
  const extractBetween = (str, startTag, endTag) => {
    const regex = new RegExp(
      `${startTag}([\\s\\S]*?)${endTag}`,
      'g'
    );
    const matches = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  };

  // Helper: strip HTML tags from text
  const stripTags = (text) => {
    return text
      .replace(/<ruby[^>]*>|<\/?rt[^>]*>|<\/ruby>/g, '') // Remove ruby/rt tags but keep content
      .replace(/<[^>]+>/g, '')                             // Remove all other tags
      .replace(/\s+/g, ' ')                                // Normalize whitespace
      .trim();
  };

  // Step 1: Split by sense-group blocks
  const senseGroupRegex = /<div\s+[^>]*data-sc-content="sense-group"[^>]*>([\s\S]*?)<\/div>\s*(?=<\/div>|<div\s+data-sc-content="sense-group"|<div\s+data-sc-content="attribution"|$)/gi;
  let groupMatch;
  
  while ((groupMatch = senseGroupRegex.exec(html)) !== null) {
    const groupContent = groupMatch[1];
    const definition = {};

    // Extract part-of-speech
    const posRegex = /<span\s+[^>]*data-sc-content="part-of-speech-info"[^>]*>([^<]+)<\/span>/gi;
    const posMatches = [...groupContent.matchAll(posRegex)];
    if (posMatches.length > 0) {
      definition.partOfSpeech = posMatches.map(m => m[1].trim());
    }

    // Extract glossary definitions (li items inside glossary ul)
    const glossaryMatch = groupContent.match(/<ul\s+[^>]*data-sc-content="glossary"[^>]*>([\s\S]*?)<\/ul>/i);
    if (glossaryMatch) {
      const liRegex = /<li>([^<]*(?:<(?!li>)[^>]+>[^<]*)*)<\/li>/gi;
      const definitions = [];
      let liMatch;
      while ((liMatch = liRegex.exec(glossaryMatch[1])) !== null) {
        const clean = stripTags(liMatch[1]);
        if (clean) definitions.push(clean);
      }
      if (definitions.length > 0) {
        definition.definitions = definitions;
      }
    }

    // Extract example sentences
    const exampleMatch = groupContent.match(/<div\s+[^>]*data-sc-content="example-sentence"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    if (exampleMatch) {
      const exampleContent = exampleMatch[1];
      
      // Japanese (example-sentence-a)
      const jpMatch = exampleContent.match(/<div\s+[^>]*data-sc-content="example-sentence-a"[^>]*>([\s\S]*?)<\/div>/i);
      // English (example-sentence-b)  
      const enMatch = exampleContent.match(/<div\s+[^>]*data-sc-content="example-sentence-b"[^>]*>([\s\S]*?)<\/div>/i);
      
      if (jpMatch || enMatch) {
        definition.example = {
          japanese: jpMatch ? stripTags(jpMatch[1]) : null,
          english: enMatch ? stripTags(enMatch[1]) : null
        };
      }
    }

    // Only push if we have definitions
    if (definition.definitions?.length > 0) {
      results.push(definition);
    }
  }

  // Fallback: if no sense-groups found, try global extraction
  if (results.length === 0) {
    const fallback = {};
    
    // POS
    const posGlobal = [...html.matchAll(/<span\s+[^>]*data-sc-content="part-of-speech-info"[^>]*>([^<]+)<\/span>/gi)];
    if (posGlobal.length) {
      fallback.partOfSpeech = posGlobal.map(m => m[1].trim());
    }
    
    // Definitions
    const glossGlobal = html.match(/<ul\s+[^>]*data-sc-content="glossary"[^>]*>([\s\S]*?)<\/ul>/i);
    if (glossGlobal) {
      const liRegex = /<li>([^<]*(?:<(?!li>)[^>]+>[^<]*)*)<\/li>/gi;
      const defs = [];
      let liMatch;
      while ((liMatch = liRegex.exec(glossGlobal[1])) !== null) {
        const clean = stripTags(liMatch[1]);
        if (clean) defs.push(clean);
      }
      if (defs.length) fallback.definitions = defs;
    }
    
    if (fallback.definitions?.length > 0) {
      results.push(fallback);
    }
  }

  return results;
}
async function findWordsbyKanji(kanji) {
    try {
        const result = await ankiConnectInvoke("findNotes", 
            5, 
            {
            "query": "deck:Mining"
            }
        );
        
        const notesInfo = await ankiConnectInvoke("notesInfo", 
            5, 
            {
            "notes": result
            }
        );
        // console.log(`got list of decks: ${JSON.stringify(result)}`);
        found = 0
        res = []   
        for (const note of notesInfo) {
            const word = note.fields.Key.value
            if (word.includes(kanji)){
                const definition = note.fields.PrimaryDefinition.value
                var obj = new Object();
                obj.word = note.fields.WordReading.value
                extractedDefinition = extractYomitanDefinitions(definition)[0]
                obj.definition = extractedDefinition.definitions
                obj.partOfSpeech = extractedDefinition.partOfSpeech
                obj.partOfSpeech = extractedDefinition.partOfSpeech
                // console.log(word, kanji, note.fields.WordReading.value)
                // console.log(extractYomitanDefinitions(definition))
                res.push(obj)
                // return obj
            }
        }
        return res
    } catch (e) {
        console.log(`error getting decks: ${e}`);
    }
}
async function listKanji() {
    try {
        const result = await ankiConnectInvoke("findNotes", 
            5, 
            {
            "query": "deck:Kanji"
            }
        );
        
        const notesInfo = await ankiConnectInvoke("notesInfo", 
            5, 
            {
            "notes": result
            }
        );
        res = []
        for (const note of notesInfo) {
            res.push(note.fields.Kanji.value)
            }
        return res
    } catch(e){
        console.log(`error getting decks: ${e}`);
    }
}
async function findKanji(kanji) {
    try {
        const result = await ankiConnectInvoke("findNotes", 
            5, 
            {
            "query": "deck:Kanji"
            }
        );
        
        const notesInfo = await ankiConnectInvoke("notesInfo", 
            5, 
            {
            "notes": result
            }
        );
        // console.log(`got list of decks: ${JSON.stringify(result)}`);
        found = 0
        // res = []
        for (const note of notesInfo) {
            if (note.fields.Kanji.value == kanji){
                // console.log("Kanji:", note.fields.Kanji.value);
                // console.log("Onyomi:", note.fields.Onyomi.value);
                // console.log("Kunyomi:", note.fields.Kunyomi.value);
                // console.log("English:", note.fields.English.value.replace(/<[^>]*>/g, ' ')); // Strip HTML
                // found += 1
                let res = {
                    kanji: note.fields.Kanji.value,
                    on_readings: note.fields.Onyomi.value,
                    kun_readings: note.fields.Kunyomi.value,
                    meanings: htmlGlossaryToJsonRegex(note.fields.English.value),
                }
                return note.noteId  
            }
        }
    } catch (e) {
        console.log(`error getting decks: ${e}`);
    }
}


function htmlGlossaryToJsonRegex(htmlString) {
    // Match content between <li> and </li>
    const regex = /<li>(.*?)<\/li>/g;
    const matches = [...htmlString.matchAll(regex)];
    
    // Extract the captured group (index 1) and trim whitespace
    const meanings = matches.map(match => match[1].trim());

    return meanings;
}

(async () => {  // ✅ Wrap in async IIFE to use top-level await
        // const res = await findKanji("限");  // ✅ Await the async function
    try {
        const allKanji = await listKanji()
        console.log(allKanji)
        const tdqm = require(`tqdm`);
        // const res = await findWordsbyKanji("念")
        // console.log(res)
        
        for (kanji of tdqm(allKanji)){
            const res = await findWordsbyKanji(kanji)
            const id = await findKanji(kanji)
            // console.log(kanji)
            var example = "<br>"
            console.log(res)
            for (ex of res){
                var speechstr = ""
                var defstr = ""
                for (pos of ex.partOfSpeech){
                    speechstr = speechstr + pos + '; '
                }
                for (def of ex.definition){
                    defstr = defstr + def + '; '
                }
                example = example + '<span style="color:lightgreen">' + ex.word + '</span>' + ': '  + defstr.slice(0,-2)+'<br>'
            }
            // console.log(example)
            // const gavno1 = await ankiConnectInvoke("updateNoteFields", 5,
            // {
            //     "note": {
            //         "id": id,
            //         "fields": {
            //             "Examples": example
            //         }
            //     }
            // })
            // console.log(id)
        }
    } catch (e) {
        console.error(`error finding kanji: ${e}`);
    }
})();
// Usage

