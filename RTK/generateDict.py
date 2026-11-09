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


with open(
    "/home/boris/projects/ankiScripts/RTK/KANJIDIC_english/kanji_bank_1.json",
    "r",
    encoding="utf-8",
) as file:
    data_dict = json.load(file)
    res = {}
    print(data_dict[0])
    for record in data_dict:
        tmp_dict = {}
        tmp_dict["on_readings"] = record[1]
        tmp_dict["kun_readings"] = record[2]
        tmp_dict["meanings"] = record[4]
        res[record[0]] = tmp_dict
with open(
    "/home/boris/projects/ankiScripts/RTK/KANJIDIC_english/kanji_bank_2.json",
    "r",
    encoding="utf-8",
) as file:
    data_dict = json.load(file)
    print(data_dict[0])
    for record in data_dict:
        tmp_dict = {}
        tmp_dict["on_readings"] = record[1]
        tmp_dict["kun_readings"] = record[2]
        tmp_dict["meanings"] = record[4]
        res[record[0]] = tmp_dict
with open(
    "/home/boris/.local/share/Anki2/User 1/collection.media/kanji.json", "w"
) as f:
    print(f"After: {len(res)}")

    json.dump(res, f, indent=4, ensure_ascii=False)
