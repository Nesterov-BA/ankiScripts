import json

with open("kanji_bank_1_wrong.json", "r", encoding="utf-8") as f:
    data = json.load(f)

new_entry = {}
for entry in data:
    # Take first 6 items, but force the 5th (index 4) to be an array
    new_entry[entry[0]] = (entry[5],)  # the story array (6th item)

with open("kanji_bank_1.json", "w", encoding="utf-8") as f:
    json.dump(new_entry, f, ensure_ascii=False, indent=2)
