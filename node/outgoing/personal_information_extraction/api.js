'use strict';

// installed modules
const express = require('express');
const axios = require('axios');
const Agent = require('agentkeepalive');

const app = express();
const port = 10000;
const tags = [
    'POSTAL_ADDRESS', 'POSTAL_ADDRESS_POSTAL_CODE', 'POSTAL_ADDRESS_COUNTRY', 'POSTAL_ADDRESS_COUNTY', 'POSTAL_ADDRESS_CITY',
    'POSTAL_ADDRESS_STREET_TYPE', 'POSTAL_ADDRESS_STREET', 'POSTAL_ADDRESS_STREET_NUMBER', 'POSTAL_ADDRESS_STREET_BLOCK',
    'POSTAL_ADDRESS_STREET_STAIRCASE', 'POSTAL_ADDRESS_STREET_APARTMENT', 'POSTAL_ADDRESS_STREET_INTERCOM', 'POSTAL_ADDRESS_STREET_FLOOR',
    'CAEN_CODE', 'CAEN_ACTIVITY', 'CARD_NUMBER', 'CARD_TYPE', 'CNP', 'GENDER', 'BIRTH_YEAR', 'BIRTH_MONTH', 'BIRTH_DAY', 'BIRTH_PLACE',
    'EMAIL_ADDRESS', 'USERNAME', 'IBAN', 'BIC', 'ACCOUNT_NUMBER', 'IP_ADDRESS', 'INTERNET_SERVICE_PROVIDER', 'POSTAL_ADDRESS_CONTINENT',
    'LATITUDE', 'LONGITUDE', 'MAC_ADDRESS', 'PHONE_NUMBER', 'VEHICLE_REGISTRATION_NUMBER', 'VEHICLE_REGISTRATION_COUNTY',
    'VEHICLE_REGISTRATION_COUNTY_CODE', 'VEHICLE_REGISTRATION_DIGITS', 'VEHICLE_REGISTRATION_TRIGRAM', 'AGE_TEXT', 'LASTNAME', 'FIRSTNAME'
]
const portToTag = {
    '10001': 'POSTAL_ADDRESS',
    '10002': 'CAEN_CODE',
    '10003': 'CARD_NUMBER',
    '10004': 'CNP',
    '10005': 'EMAIL_ADDRESS',
    '10006': 'IBAN',
    '10007': 'IP_ADDRESS',
    '10008': 'MAC_ADDRESS',
    '10009': 'PHONE_NUMBER',
    '10010': 'VEHICLE_REGISTRATION_NUMBER',
    '10011': 'AGE_TEXT',
    '10012': 'FIRSTNAME',
    '10013': 'LASTNAME'
};

app.use(express.urlencoded({extended: true}));
app.use(express.json());

const ax = axios.create({httpAgent: new Agent({
    keepAlive: false,
    maxSockets: 300,
    maxFreeSockets: 300,
    timeout: 60000,
    freeSocketTimeout: 30000,
})});

function callExtractorAPI(text, port) {
    return ax.post(`http://localhost:${port}`, {text}).then(res => res.data);
}

async function extract(text) {
    const tokens = [];
    const additionalData = [];

    for (let i = 10001; i <= 10013; i++) {
        const data = await callExtractorAPI(text, i);
        for (const datum of data) {
            tokens.push({tag: portToTag[i.toString()], start: datum.start, end: datum.end, score: datum.score || 1});
            if (datum.tokens && datum.tokens.length) {
                for (const token of datum.tokens) {
                    for (const type of token.types) {
                        tokens.push({tag: type, start: token.start, end: token.end, score: token.score || 1});
                    }
                }
            }
            if (datum.additional) {
                for (const d of Object.keys(datum.additional)) {
                    additionalData.push({tag: d, value: datum.additional[d]});
                }
            }
        }
    }

    const tokensResult = [];
    for (const token of tokens) {
        const index = tokensResult.findIndex(t => token.start === t.start && token.end === t.end);
        if (index >= 0) {
            if (tokensResult[index].tags[token.tag]) {
                tokensResult[index].tags[token.tag].push(token.score);
            } else {
                tokensResult[index].tags[token.tag] = [token.score];
            }
        } else {
            tokensResult.push({start: token.start, end: token.end, tags: {[token.tag]: [token.score]}});
        }
    }
    for (const token of tokensResult) {
        for (const tag of Object.keys(token.tags)) {
            token.tags[tag] = token.tags[tag].reduce((p, c) => p + c, 0) / token.tags[tag].length;
        }
    }

    const addtionalResult = {};
    for (const additionalDatum of additionalData) {
        if (addtionalResult[additionalDatum.tag]) {
            addtionalResult[additionalDatum.tag].push(additionalDatum.value);
        } else {
            addtionalResult[additionalDatum.tag] = [additionalDatum.value];
        }
    }

    return {
        personal_information: tokensResult,
        inferred_personal_information: addtionalResult
    };
}

app.post('/',  async function (req, res) {
    extract(req.body.text).then(result => {
        res.json(result);
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
});
