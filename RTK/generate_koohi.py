import json
import requests
from tqdm import tqdm
import pandas as pd
import numpy as np
import markdown

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

rtk_df = pd.read_csv("stories.csv", sep=";")
rtk_df.columns = range(len(rtk_df.columns))
rtk_df.index = rtk_df[0]
rtk_df.fillna("")
story_dict = rtk_df[2].fillna("").to_dict()
def kanji_list():
    ids = anki_connect_invoke(
        "findNotes",
        5,
        {
            "query": "deck:Kanji",
        },
    )
    notes = anki_connect_invoke("notesInfo", 5, {"notes": ids})
    # list = []
    # print(notes)
    for note in tqdm(notes):
        kanji = note["fields"]["Kanji"]["value"]
        if not kanji or kanji not in story_dict:
            print(f"skip note {note['noteId']}: kanji={kanji!r}")
            continue
        raw_story = story_dict.get(kanji)
        if not raw_story:
            continue

        # Convert Markdown to HTML
        html_story = markdown.markdown(raw_story)
        params = {
            "note": {
                "id": note["noteId"],  # ID вашей заметки (noteId)
                "fields": {
                    "KoohiiStory1": html_story,
                },
            }
        }
        anki_connect_invoke("updateNoteFields", 5, params)
kanji_list()