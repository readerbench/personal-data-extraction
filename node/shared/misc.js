'use strict'

const diacriticsReplacementMap = {};
Object.entries({
    's': ['ș', 'ş'],
    'S': ['Ș', 'Ş'],
    't': ['ț', 'ţ'],
    'T': ['Ț', 'Ţ'],
    'a': ['ă', 'â'],
    'A': ['Ă', 'Â'],
    'i': ['î'],
    'I': ['Î']
}).forEach(([replacementChar, charsToReplace]) => charsToReplace.forEach(char => diacriticsReplacementMap[char] = replacementChar));
const objKey = Object.keys(diacriticsReplacementMap);
function removeDiacritics(text) {
    objKey.forEach(charToReplace => {
        text = text.replaceAll(charToReplace, diacriticsReplacementMap[charToReplace]);
    });
    return text;
}

module.exports = {
    diacriticsReplacementMap,
    removeDiacritics
};
