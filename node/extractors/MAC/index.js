'use strict';

// local modules
const Extractor = require('../../shared/extractor');

class _Extractor_MAC extends Extractor {
    constructor() {
        super({
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+|:|-|\\s+`, 'gim'),
            candidatRegex: new RegExp('(?:[0-9A-Fa-f]{2}([-: ]?))(?:[0-9A-Fa-f]{2}\\1){4}[0-9A-Fa-f]{2}|([0-9A-Fa-f]{4}\\.){2}[0-9A-Fa-f]{4}', 'gmi'),
            isCandidatValid: () => true,
            extractAdditionalData: () => {}
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            datum.possibleData = [datum.text];
            return datum;
        });
    }
}

module.exports = class Extractor_MAC {
    #extractor;
    constructor() {
        this.#extractor = new _Extractor_MAC();
    }

    extract(text) {
        return this.#extractor.extract(text);
    }
}
