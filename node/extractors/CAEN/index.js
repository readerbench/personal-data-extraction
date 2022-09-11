'use strict';

// internal modules
const fs = require('fs');
const path = require('path');

// installed modules
const {parse} = require('fast-csv');

// local modules
const Extractor = require('../../shared/extractor');

class _Extractor_CAEN extends Extractor {
    #caens = [];
    #caenToActivity = {};
    constructor() {
        super({
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+|\\s+`, 'gim'),
            candidatRegex: new RegExp('\\b\\d{4}\\b', 'gmi'),
            isCandidatValid: candidate => this.#caens.includes(candidate),
            extractAdditionalData: text => {
                return {CAEN_ACTIVITY: this.#caenToActivity[text]};
            }
        });
    }

    init() {
        return new Promise(resolve => {
            fs.createReadStream(path.resolve(__dirname, `./datasets/caen.csv`))
                .pipe(parse({headers: false}))
                .on('data', row => {
                    this.#caens.push(row[0]);
                    this.#caenToActivity[row[0]] = row[1];
                })
                .on('end', () => {
                    resolve();
                });
        })
    }

    generatePossibleData(data) {
        return data.map(datum => {
            datum.possibleData = [datum.text.slice(0, 2)];
            return datum;
        });
    }
}

module.exports = class Extractor_CAEN {
    #extractor;
    constructor() {
        this.#extractor = new _Extractor_CAEN();
    }

    init() {
        return this.#extractor.init();
    }

    extract(text) {
        return this.#extractor.extract(text);
    }
}
