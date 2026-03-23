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
            return res  
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
    try {
        // const res = await findKanji("限");  // ✅ Await the async function
        // console.log("Result:", res);
        const allKanji = new Set();
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
    const regex = /([\u4E00-\u9FFF])/g
    
    for (note of notesInfo){
        word = note.fields.Key.value
        const matches = word.matchAll(regex)
        for (const match of matches) {
            console.log(word, match[1])
            allKanji.add(match[1])  // ✅ match[1] is the captured kanji, not the whole match array
        }
    }
    // for(kanji of allKanji){
    //     console.log(kanji)
    // }
    } catch (e) {
        console.error(`error finding kanji: ${e}`);
    }
})();
// Usage

