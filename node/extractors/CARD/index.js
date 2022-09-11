'use strict';

// installed modules
const cardValidator = require("card-validator");

// local modules
const Extractor = require('../../shared/extractor');

// globals
const cardCandidatesRegexes = [
    new RegExp('[0-9]{19}', 'gmi'),
    new RegExp('[0-9]{18}', 'gmi'),
    new RegExp('[0-9]{17}', 'gmi'),
    new RegExp('[0-9]{16}', 'gmi'),
    new RegExp('[0-9]{15}', 'gmi'),
    new RegExp('[0-9]{14}', 'gmi'),
    new RegExp('[0-9]{13}', 'gmi')
];

class _Extractor_CARD extends Extractor {
    constructor(candidatRegex) {
        super({
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+`, 'gim'),
            candidatRegex: candidatRegex,
            isCandidatValid: candidate => cardValidator.number(candidate).isValid,
            extractAdditionalData: text => ({CARD_TYPE: cardValidator.number(text).card.niceType})
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            datum.possibleData = [
                datum.text,
                datum.text.match(/.{1,4}/g).join(' '),
                datum.text.match(/.{1,4}/g).join('.'),
                datum.text.match(/.{1,4}/g).join('-')
            ];
            return datum;
        });
    }
}

module.exports = class Extractor_CARD {
    #extractors;
    constructor() {
        this.#extractors = [];
        for (const cardCandidatesRegex of cardCandidatesRegexes) {
            this.#extractors.push(new _Extractor_CARD(cardCandidatesRegex));
        }
    }

    async extract(text) {
        const result = [];
        for (const extractor of this.#extractors) {
            result.push(...await extractor.extract(text));
        }
        return result;
    }
}
