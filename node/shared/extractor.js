'use strict';

// installed modules
const {distance, closest} = require('fastest-levenshtein');

// internal modules
const {removeDiacritics} = require('./misc');

module.exports = class Extractor {

    #config;
    constructor(config) {
        this.#config = config;
    }

    #tokenize(text) {
        return [...text.matchAll(this.#config.tokenizeRegex)].map(match => ({text: match[0], start: match[0] ? match.index : -1, end: match.index + match[0].length - 1})).filter(token => token.start !== -1);
    }

    #charize(tokens) {
        return tokens
            .map(token => token.text.split('').map((char, i) => ({char: char, originalIndex: token.start + i})))
            .reduce((prev, cur) => prev.concat(cur), []);
    }

    #combine(tokens) {
        return tokens.map(token => token.char).join('');
    }

    #findCandidates(combinedText) {
        return [...combinedText.matchAll(this.#config.candidatRegex)].map(match => ({text: match[0], start: match[0] ? match.index : -1, end: match.index + match[0].length - 1}));
    }

    #checkCandidates(candidates) {
        return candidates.filter(candidate => this.#config.isCandidatValid(candidate.text));
    }

    async #extractAdditionalData(data) {
        for (const datum of data) {
            datum.additionalData = await this.#config.extractAdditionalData(datum.text);
        }
        return data;
    }

    #findOriginalPosition(data, tokenChars) {
        return data.map(datum => {
            datum.original_start = tokenChars[datum.start].originalIndex;
            datum.original_end = tokenChars[datum.end].originalIndex;
            return datum;
        });
    }

    #findOriginalData(data, text) {
        return data.map(datum => {
            datum.original = text.slice(datum.original_start, datum.original_end + 1);
            return datum;
        });
    }

    generatePossibleData(data) {}

    #calculateScores(data) {
        return data.map(datum => {
            const closestDatum = closest(datum.original, datum.possibleData);
            const levenDistance = distance(datum.original, closestDatum);
            datum.score = 1 - (levenDistance / datum.original.length);
            return datum;
        });
    }

    async extract(text) {
        text = removeDiacritics(text);

        if (this.#config.uppercase === true || typeof this.#config.uppercase === 'undefined') {
            text = text.toUpperCase();
        }

        const tokensChars = this.#charize(this.#tokenize(text));
        const data = this.#calculateScores(this.generatePossibleData(this.#findOriginalData(this.#findOriginalPosition(await this.#extractAdditionalData(this.#checkCandidates(this.#findCandidates(this.#combine(tokensChars)))), tokensChars), text)))
        return data.map(datum => ({
            start: datum.original_start,
            end: datum.original_end,
            score: datum.score,
            additional: datum.additionalData
        }));
    }
}
