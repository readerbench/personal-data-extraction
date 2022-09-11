import sys
import csv
import Levenshtein


sys.path.append('./shared')
import ner


female_firstnames = []
male_firstnames = []
with open("extractors/FIRSTNAME/datasets/firstnames.csv", "r") as file:
    csvreader = csv.reader(file)
    next(csvreader)
    for row in csvreader:
        if row[0]:
            female_firstnames.append(row[0])
        if row[1]:
            male_firstnames.append(row[1])


def find_score(candidate):
    female_distances = [Levenshtein.distance(candidate, name) for name in female_firstnames]
    male_distances = [Levenshtein.distance(candidate, name) for name in male_firstnames]
    female_min_distance = min(female_distances)
    male_min_distance = min(male_distances)
    female_score = 0
    male_score = 0
    if female_min_distance <= 2:
        female_score = 1 - (female_min_distance / len(candidate))
    if male_min_distance <= 2:
        male_score = 1 - (male_min_distance / len(candidate))
    if female_score > male_score:
        return {
            'score': female_score,
            'gender': 'female'
        }
    elif male_score > female_score:
        return {
            'score': male_score,
            'gender': 'male'
        }
    else:
        return {
            'score': male_score
        }


def extract(text):
    ner_tags = ner.get_ner(text)
    candidates = [tag for tag in ner_tags if tag["label"] == "PERSON"]
    result = []
    for candidate in candidates:
        data = find_score(candidate['text'])
        if data['score'] > 0:
            additional_data = None
            if data['gender']:
                additional_data = {
                    'GENDER': data['gender']
                }
            result.append({
                'start': candidate['start'],
                'end': candidate['end'],
                'score': data['score'],
                'additional': additional_data
            })
    return result

