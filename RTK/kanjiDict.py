import json

import numpy as np
import pandas as pd
import requests
from tqdm import tqdm


def anki_connect_invoke(action, version, params=None):
    if params is None:
        params = {}
    url = "http://127.0.0.1:8765"
    payload = {"action": action, "version": version, "params": params}
    response = requests.post(url, json=payload)
    if response.status_code != 200:
        raise Exception(f"HTTP error! status: {response.status_code}")
    data = response.json()
    if data.get("error") is not None:
        raise Exception(data["error"])
    if "result" not in data:
        raise Exception("failed to get results from AnkiConnect")
    return data["result"]


def kanji_json():
    ids = anki_connect_invoke(
        "findNotes",
        5,
        {
            "query": "deck:Kanji",
        },
    )
    notes = anki_connect_invoke("notesInfo", 5, {"notes": ids})
    res = {}
    for note in tqdm(notes):
        # return note
        defin = note["fields"]["English"]["value"].split("<li>")
        print(defin)

        if len(defin) == 1:
            defin = (
                defin[0]
                .replace('<div style="text-align: left;" class="yomitan-glossary">', "")
                .replace("</div>", "")
            )
            # defin = defin.split(';')
            # if len(defin) == 1:
            defin = defin.replace(
                '<div style="text-align: center;" class="yomitan-glossary">', ""
            ).split(",")
            defin = defin[0].split(";")
            for i in range(len(defin)):
                defin[i] = defin[i].strip().lstrip()
        else:
            for i in range(len(defin)):
                defin[i] = (
                    defin[i]
                    .replace("</li>", "")
                    .replace("</ol></div>", "")
                    .replace("<br>", "")
                    .replace("&#x27;", "'")
                    .strip()
                    .lstrip()
                )
            defin = defin[1:]
        # print(defin)
        tmp_dict = {}
        tmp_dict["on_readings"] = note["fields"]["Onyomi"]["value"]
        tmp_dict["kun_readings"] = note["fields"]["Kunyomi"]["value"]
        tmp_dict["meanings"] = defin
        res[note["fields"]["Kanji"]["value"]] = tmp_dict
    return res


# cardIds = anki_connect_invoke(
#     "findCards",
#     5,
#     {
#         "query": "deck:Mining",
#     },
# )
# print(len(cardIds))
# cardsInfo = anki_connect_invoke("cardsInfo", 5, {"cards": cardIds})
# for card in cardsInfo:
#     print(card["interval"])
#
# with open("cardinfo.json", "w") as f:
#     print(f"After: {len(cardsInfo)}")
#
#     json.dump(cardsInfo[-1], f, indent=4, ensure_ascii=False)

data = kanji_json()

with open(
    "/home/boris/.local/share/Anki2/User 1/collection.media/kanji.json",
    "r",
    encoding="utf-8",
) as file:
    data_dict = json.load(file)
    kanji_deck = set(data_dict.keys())
    print(f"Before: {len(kanji_deck)}")

with open(
    "/home/boris/.local/share/Anki2/User 1/collection.media/kanji.json", "w"
) as f:
    print(f"After: {len(data)}")

    json.dump(data, f, indent=4, ensure_ascii=False)
