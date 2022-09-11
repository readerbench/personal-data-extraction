import sys
import spacy
import string
import unidecode

sys.path.append('./shared')
import ner


nlp = spacy.load("ro_core_news_lg")
starting_lemmas = ['varsta', 'avea', 'nastere', 'implini', 'face', 'naste']


def extract_person_and_datetime_groups(text):
    ner_tags = ner.get_ner(text)
    person_groups = []
    datetime_groups_without_next = []
    datetime_groups_with_next = []
    datetime_groups_regrouped = [[{'next': -1}]]
    datetime_groups = []

    # find all DATETIME and PERSON tokens groups
    for i in range(len(ner_tags)):
        tag = ner_tags[i]
        if tag['label'] == 'DATETIME':
            if tag['multi']:
                datetime_groups_without_next[-1].append({'start': tag['start'], 'end': tag['end']})
            else:
                datetime_groups_without_next.append([{'start': tag['start'], 'end': tag['end']}])
        elif tag['label'] == 'PERSON':
            next_token_start = -1
            aux = i
            while aux + 1 < len(ner_tags):
                if ner_tags[aux + 1]['pos'] == 'PUNCT':
                    aux = aux + 1
                    continue
                else:
                    next_token_start = ner_tags[aux + 1]['start']
                    break
            person_groups.append({'start': tag['start'], 'end': tag['end'], 'next': next_token_start})

    # set datetime groups next group start
    for i in range(len(datetime_groups_without_next)):
        group = datetime_groups_without_next[i]
        next_group_start = -1
        if i + 1 < len(datetime_groups_without_next):
            next_group_start = datetime_groups_without_next[i + 1][0]['start']
        datetime_groups_with_next.append({'start': group[0]['start'], 'end': group[-1]['end'], 'next': next_group_start})

    # group multiple consecutive DATETIME tokens groups together
    for group in datetime_groups_with_next:
        if group['start'] == datetime_groups_regrouped[-1][-1]['next']:
            datetime_groups_regrouped[-1].append({'start': group['start'], 'end': group['end'], 'next': group['next']})
        else:
            datetime_groups_regrouped.append([{'start': group['start'], 'end': group['end'], 'next': group['next']}])
    datetime_groups_regrouped = datetime_groups_regrouped[1:]

    # merge multiple consecutive DATETIME tokens groups
    for ff in datetime_groups_regrouped:
        datetime_groups.append({'start': ff[0]['start'], 'end': ff[-1]['end']})

    return [person_groups, datetime_groups]


def extract_labels(text):

    # remove punctuation
    text = text.translate(str.maketrans(string.punctuation, ' '*len(string.punctuation)))

    ner_tags = nlp(text)
    tokens = []

    for tag in ner_tags:
        if tag.pos_ != 'SPACE':
            tokens.append({
                'lemma': unidecode.unidecode(tag.lemma_),  # remove diacritics
                'start': tag.idx,
                'end': tag.idx + len(tag.text) - 1
            })

    indexes = [i for i in range(len(tokens)) if tokens[i]['lemma'] in starting_lemmas]

    labels = []
    for idx in indexes:
        if tokens[idx]['lemma'] == 'varsta':
            if idx + 1 < len(tokens) and tokens[idx + 1]['lemma'] == 'de':
                if idx + 2 < len(tokens):
                    labels.append({'start': tokens[idx]['start'], 'end': tokens[idx + 1]['end'], 'next': tokens[idx + 2]['start']})
            else:
                if idx + 1 < len(tokens):
                    labels.append({'start': tokens[idx]['start'], 'end': tokens[idx]['end'], 'next': tokens[idx + 1]['start']})
        elif tokens[idx]['lemma'] in ['avea', 'nastere', 'implini', 'face']:
            if idx + 1 < len(tokens):
                labels.append({'start': tokens[idx]['start'], 'end': tokens[idx]['end'], 'next': tokens[idx + 1]['start']})
        elif tokens[idx]['lemma'] == 'naste':
            if idx + 1 < len(tokens) and tokens[idx + 1]['lemma'] in ['pe', 'la', 'in']:
                if idx + 2 < len(tokens) and tokens[idx + 2]['lemma'] == 'data':
                    if idx + 3 < len(tokens) and tokens[idx + 3]['lemma'] == 'de':
                        if idx + 4 < len(tokens):
                            labels.append({'start': tokens[idx]['start'], 'end': tokens[idx + 3]['end'], 'next': tokens[idx + 4]['start']})
                    else:
                        if idx + 3 < len(tokens):
                            labels.append({'start': tokens[idx]['start'], 'end': tokens[idx + 2]['end'], 'next': tokens[idx + 3]['start']})
                else:
                    if idx + 2 < len(tokens):
                        labels.append({'start': tokens[idx]['start'], 'end': tokens[idx + 1]['end'], 'next': tokens[idx + 2]['start']})
    return labels


def extract(text):
    [person_groups, datetime_groups] = extract_person_and_datetime_groups(text)
    labels = extract_labels(text)
    result = []
    for datetime_group in datetime_groups:
        a = [i for i in range(len(labels)) if labels[i]['next'] == datetime_group['start']]
        b = [i for i in range(len(person_groups)) if person_groups[i]['next'] == datetime_group['start']]
        if len(a) > 0 or len(b) > 0:
            result.append(datetime_group)
            break
    return result
