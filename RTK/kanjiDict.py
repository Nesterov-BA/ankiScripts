import ast
import json
import re
from collections import Counter

import requests
from tqdm import tqdm


def anki_connect_invoke(action, version, params=None):
    """

    Args:
        action ():
        version ():
        params ():

    Returns:


    Raises:
        Exception:
    """
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


def word_list():
    ids = anki_connect_invoke(
        "findNotes",
        5,
        {
            "query": "deck:Mining",
        },
    )
    notes = anki_connect_invoke("notesInfo", 5, {"notes": ids})
    list = []
    for note in tqdm(notes):
        list.append(note["fields"]["Word"]["value"])
    return list


def kanji_json():
    """

    Returns:
        JSON containing all information about kanji in deck
    """
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
kanji_list = set(data.keys())
# words = word_list()

# counts = Counter("".join(words))
# all_kanji_in_words = set("".join(words))
# KANJI = re.compile(r"[\u3005\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]")

# kanji_only = {c for c in all_kanji_in_words if KANJI.fullmatch(c)}
# print(kanji_only - kanji_list)
# d = {k: counts[k] for k in kanji_list}
# sorted_d = dict(sorted(d.items(), key=lambda kv: (-kv[1], kv[0])))
# print(len(kanji_list))
# print(sorted_d)
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
