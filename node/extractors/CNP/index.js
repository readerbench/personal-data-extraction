'use strict';

// installed modules
const CNP = require('romanian-personal-identity-code-validator').CNP;

// local modules
const Extractor = require('../../shared/extractor');

class _Extractor_CNP extends Extractor {
    constructor() {
        super({
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+`, 'gim'),
            candidatRegex: new RegExp('[1-8]\\d{2}(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])(0[1-9]|[1-3][0-9]|4[0-6]|5[1-2])\\d{4}', 'gmi'),
            isCandidatValid: candidate => new CNP(candidate).isValid(),
            extractAdditionalData: text => {
                const cnp = new CNP(text);
                return {
                    GENDER: cnp.getGender(),
                    BIRTH_YEAR: cnp.getBirthDate('YYYY'),
                    BIRTH_MONTH: cnp.getBirthDate('MM'),
                    BIRTH_DAY: cnp.getBirthDate('DD'),
                    BIRTH_PLACE: cnp.getBirthPlace()
                };
            }
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            datum.possibleData = [datum.text];
            return datum;
        });
    }
}

module.exports = class Extractor_CNP {
    #extractor;
    constructor() {
        this.#extractor = new _Extractor_CNP();
    }

    extract(text) {
        return this.#extractor.extract(text);
    }
}
