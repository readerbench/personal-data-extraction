'use strict';

// local modules
const Extractor = require('../../shared/extractor');

class _Extractor_EMAIL extends Extractor {
    constructor() {
        super({
            uppercase: false,
            tokenizeRegex: new RegExp(`.*`, 'gim'),
            candidatRegex: new RegExp('(?:[a-z0-9!#$%&\'*+\\/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+\\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\\])', 'gmi'),
            isCandidatValid: () => true,
            extractAdditionalData: text => ({USERNAME: text.split('@')[0]})
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            datum.possibleData = [datum.text];
            return datum;
        });
    }
}

module.exports = class Extractor_EMAIL {
    #extractor;
    constructor() {
        this.#extractor = new _Extractor_EMAIL();
    }

    extract(text) {
        return this.#extractor.extract(text);
    }
}
