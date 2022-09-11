import sys
import csv
import Levenshtein


sys.path.append('./shared')
import ner


lastnames = []
with open("extractors/LASTNAME/datasets/lastnames.csv", "r") as file:
    csvreader = csv.reader(file)
    next(csvreader)
    for row in csvreader:
        lastnames.append(row[0])


def find_score(candidate):
    distances = [Levenshtein.distance(candidate, name) for name in lastnames]
    min_distance = min(distances)
    if min_distance <= 2:
        return 1 - (min_distance / len(candidate))
    else:
        return 0


def extract(text):
    ner_tags = ner.get_ner(text)
    candidates = [tag for tag in ner_tags if tag["label"] == "PERSON"]
    result = []
    for candidate in candidates:
        score = find_score(candidate['text'])
        if score > 0:
            result.append({
                'start': candidate['start'],
                'end': candidate['end'],
                'score': score,
                'additional': None
            })
    return result

