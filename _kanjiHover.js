var body = document.getElementById('kanjiHover')
if (body) body = body.innerHTML
var kanji = new Set()
var kanjiDict = {}

if (body) {
  appendCSS()
  appendHoverDiv()
  findKanji()
  getKanjiData().then(() => {  // ✅ No need for 'r' parameter
    let kanjiTargets = document.getElementsByClassName("kanjiHoverTarget")
    Array.from(kanjiTargets).forEach(function (element) {
      element.addEventListener('mouseenter', onKanjiHover)
      element.addEventListener('mouseleave', onKanjiUnhover)
    });
  })
}
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
function appendHoverDiv() {
  var hoverDiv = document.createElement('div')
  hoverDiv.classList.add("hoverDiv")
  document.body.appendChild(hoverDiv)
}

function findKanji() {
  // Fixed regex: match CJK Unified Ideographs (more complete range)
  const regex = /([\u4E00-\u9FFF])/g
  const matches = body.matchAll(regex)
  for (const match of matches) {
    kanji.add(match[1])  // ✅ match[1] is the captured kanji, not the whole match array
  }

  body = body.replace(regex, (match) => `<span class="kanjiHoverTarget">${match}</span>`)
  document.getElementById('kanjiHover').innerHTML = body;
}

function htmlGlossaryToJsonRegex(htmlString) {
    // Try to match <li> elements first
    const liRegex = /<li>(.*?)<\/li>/g;
    const liMatches = [...htmlString.matchAll(liRegex)];
    
    if (liMatches.length > 0) {
        return liMatches.map(match => match[1].trim());
    }
    
    // Fallback: extract text between > and < of the glossary div
    const singleRegex = /class="yomitan-glossary"[^>]*>([^<]*)<\/div>/;
    const singleMatch = htmlString.match(singleRegex);
    
    if (singleMatch && singleMatch[1].trim()) {
        return [singleMatch[1].trim()];
    } 
    
    return htmlString;
}

async function findKanjimine(kanji) {
    try {
      const result = await ankiConnectInvoke("findNotes", 5, {
          "query": "deck:Kanji"
      });
      
      if (result.length === 0) return createNotFoundResult(kanji);  // ✅ Early return
      
      const notesInfo = await ankiConnectInvoke("notesInfo", 5, {
          "notes": result
      });
      
      for (const note of notesInfo) {
          if (note.fields.Kanji.value == kanji) {  // ✅ Use === for strict comparison
              return {
                  kanji: note.fields.Kanji.value,
                  on_readings: note.fields.Onyomi.value || '',
                  kun_readings: note.fields.Kunyomi.value || '',
                  meanings: htmlGlossaryToJsonRegex(note.fields.English.value),
                  found: true
              }
          }
      }

      // ✅ RETURN the not-found result (this was missing!)
      return createNotFoundResult(kanji);
      
    } catch (e) {
        console.error(`Error fetching "${kanji}": ${e}`);
        return createNotFoundResult(kanji);  // ✅ Handle errors gracefully
    }
}

// ✅ Helper to create consistent "not found" objects
function createNotFoundResult(kanji) {
    return {
        kanji: kanji,
        on_readings: '',
        kun_readings: '',
        meanings: [],  // ✅ Empty array, not string 'none'
        found: false
    }
}

async function getKanjiData() {
  const kanjiArray = [...kanji];  // ✅ Use const, avoid reassigning global
  
  let kanjiArr = await Promise.all(
    kanjiArray.map(async character => {
      // ✅ AWAIT the promise! This was the main bug.
      let res = await findKanjimine(character);
      return res;
    })
  );

  // Populate dictionary with kanji as key
  for (const item of kanjiArr) {
    // ✅ Safety check: skip undefined items
    if (item && item.kanji) {
      kanjiDict[item.kanji] = buildString(item);
    }
  }
}

function onKanjiHover(event) {
  let hoverDiv = document.getElementsByClassName("hoverDiv")[0];
  const char = event.target.innerHTML;
  
  if (kanjiDict[char]) {
    hoverDiv.innerHTML = kanjiDict[char];
    hoverDiv.style.display = "block";
    
    // ✅ Position hover div near cursor (optional UX improvement)
    hoverDiv.style.left = (event.pageX + 10) + 'px';
    hoverDiv.style.top = (event.pageY + 10) + 'px';
    hoverDiv.style.transform = 'none'; // Override centering from CSS
  }
}

function onKanjiUnhover(event) {
  let hoverDiv = document.getElementsByClassName("hoverDiv")[0];
  // ✅ Fix typo: innerHTML (capital H), not innerHtml
  hoverDiv.innerHTML = "";
  hoverDiv.style.display = "none";
}

function buildString(kanjiData) {
  // ✅ Handle not-found case gracefully
  if (!kanjiData.found) {
    return `<span class="hoverText">Kanji:</span> ${kanjiData.kanji}<br><span style="color:#888">Not in deck</span>`;
  }
  
  let s = '<span class="hoverText">Kanji:</span> ' + kanjiData.kanji + '<br>';
  
  if (kanjiData.grade)
    s += '<span class="hoverText">Grade:</span> ' + kanjiData.grade + '<br>';
    
  s += '<span class="hoverText">Meaning:</span> ';
  
  // ✅ Safely handle meanings array
  if (Array.isArray(kanjiData.meanings) && kanjiData.meanings.length > 0) {
    s += kanjiData.meanings.join(', ');
  } else {
    s += '<span style="color:#888">No meaning</span>';
  }
  s += '<br>';

  // ✅ Safely handle kun_readings (ensure it's an array)
  const kunReadings = Array.isArray(kanjiData.kun_readings) 
    ? kanjiData.kun_readings 
    : (kanjiData.kun_readings || '').split(',').map(s => s.trim()).filter(s => s);
    
  if (kunReadings.length > 0) {
    s += '<span class="hoverText">Kun\'yomi:</span> ' + kunReadings.join(', ') + '<br>';
  }

  // ✅ Safely handle on_readings
  const onReadings = Array.isArray(kanjiData.on_readings) 
    ? kanjiData.on_readings 
    : (kanjiData.on_readings || '').split(',').map(s => s.trim()).filter(s => s);
    
  if (onReadings.length > 0) {
    s += '<span class="hoverText">On\'yomi:</span> ' + onReadings.join(', ') + '<br>';
  }

  return s;
}

function appendCSS() {
  var styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
  .hoverDiv {
    position: fixed;
    width: 30vw;
    max-width: 400px;
    background-color: #1E1A1E;
    color: #fff;
    text-align: left;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 10000;
    display: none;
    font-size: 16px;
    line-height: 1.4;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    pointer-events: none; /* Don't block mouse events */
  }
  
  .hoverText {
    color: #e95464;
    font-weight: 600;
  }

  .kanjiHoverTarget {
    cursor: help;
    border-bottom: 1px dotted #e95464;
  }

  @media only screen and (max-width: 768px) {
      .hoverDiv { width: 90vw; font-size: 15px; }
  } 
  `;
  document.head.appendChild(styleSheet);
}