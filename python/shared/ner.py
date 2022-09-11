import roner
ner = roner.NER()


def get_ner(text):
    doc = ner(text)[0]
    results = []
    for ent in doc['words']:
        results.append({
            "text": ent['text'],
            "start": ent['start_char'],
            "end": ent['end_char'] - 1,
            "label": ent['tag'],
            "pos": ent['pos'],
            "multi": ent["multi_word_entity"]
        })
    return results
