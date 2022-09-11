'use strict';

// installed modules
const _ = require("lodash");
const natural = require('natural');
const axios = require('axios');
const Agent = require('agentkeepalive');

// local modules
const {diacriticsReplacementMap, removeDiacritics} = require('../../shared/misc');
const fs = require('fs');
const path = require('path');
const {parse} = require('fast-csv');
const {distance} = require('fastest-levenshtein');

// globals
const separatorChars = [
    ' ', ',', '.', ':','\\(', '\\)', '\\[', '\\]', '\\{', '\\}', '«', '»',
    '‹', '›', '<', '>', '"', "'", ';', '‘', '“', '„', '¸', '”',
    'ˮ', '\\|', '`', '΄', '´', 'ˈ', '˙', '=', '½', '¹', '\t', ' '
];
const everythingButSeparatorsRegexForDictionary = new RegExp(`[^${separatorChars.join('')}]+`, 'gim');
const tokenTypes = {
    'ADDRESS_PREFIX': 'address_prefix',
    'POSTAL_CODE_TEXT': 'postal_code_text',
    'POSTAL_CODE': 'postal_code',
    'COUNTRY_TEXT': 'country_text',
    'COUNTRY': 'country',
    'COUNTY_TEXT': 'county_text',
    'COUNTY': 'county',
    'CITY_TEXT': 'city_text',
    'CITY': 'city',
    'STREET_TEXT': 'street_text' ,
    'STREET_TYPE': 'street_type',
    'STREET': 'street',
    'STREET_NUMBER_TEXT': 'street_number_text',
    'STREET_NUMBER': 'street_number',
    'BLOCK_TEXT': 'block_text',
    'BLOCK': 'block',
    'STAIRCASE_TEXT': 'staircase_text',
    'STAIRCASE': 'staircase',
    'APARTMENT_TEXT': 'apartment_text',
    'APARTMENT': 'apartment',
    'INTERCOM_TEXT': 'intercom_text',
    'INTERCOM': 'intercom',
    'FLOOR_TEXT': 'floor_text',
    'FLOOR': 'floor'
};
const successions = {
    'postal_code_text': ['postal_code'],
    'country_text': ['country'],
    'county_text': ['county'],
    'city_text': ['city'],
    'street_text': ['street_type', 'street'],
    'street_type': ['street'],
    'street': ['street_number_text', 'street_number'],
    'street_number_text': ['street_number'],
    'block_text': ['block'],
    'staircase_text': ['staircase'],
    'apartment_text': ['apartment'],
    'intercom_text': ['intercom'],
    'floor_text': ['floor']
}
const mandatorySuccessions = {
    'address_prefix': ['postal_code_text',
        'postal_code',
        'country_text',
        'country',
        'county_text',
        'county',
        'city_text',
        'city',
        'street_text' ,
        'street_type',
        'street',
        'street_number_text',
        'street_number',
        'block_text',
        'block',
        'staircase_text',
        'staircase',
        'apartment_text',
        'apartment',
        'intercom_text',
        'intercom',
        'floor_text',
        'floor'],
    'postal_code_text': ['postal_code'],
    'country_text': ['country'],
    'county_text': ['county'],
    'city_text': ['city'],
    'street_text': ['street_type', 'street'],
    'street_type': ['street'],
    'street_number_text': ['street_number'],
    'block_text': ['block'],
    'staircase_text': ['staircase'],
    'apartment_text': ['apartment'],
    'intercom_text': ['intercom'],
    'floor_text': ['floor']
}
const mandatoryPredecessors = {
    'floor': ['floor_text'],
    'block': ['block_text'],
    'staircase': ['staircase_text'],
    'apartment': ['apartment_text'],
    'intercom': ['intercom_text'],
    'street_number': ['street_number_text', 'street']
};
const mandatoryTypes = [
    tokenTypes.CITY,
    tokenTypes.STREET,
    tokenTypes.STREET_NUMBER
];

const nonSeparatorChars = [',', '\\.', ':', ';', '\\(', '\\)', '\\[', '\\]', '\\{', '\\}', '"', "'", '‘', '“', '„', '¸', '”', 'ˮ'];
const everythingButSeparatorsRegex = new RegExp(`${nonSeparatorChars.join('|')}|[^${separatorChars.join('')}]+`, 'gim');
const wordFeatures = {
    NO_DIGITS: 'NO_DIGITS',
    NO_LETTERS: 'NO_LETTERS',
    HAS_HYPHEN: 'HAS_HYPHEN',
    ONE_CHAR: 'ONE_CHAR',
    NO_LOWERCASE: 'NO_LOWERCASE',
    NO_UPPERCASE: 'NO_UPPERCASE',
    FIRST_UPPERCASE: 'FIRST_UPPERCASE'
};
const wordFeaturesFunctions = {
    NO_DIGITS: str => !/\d/.test(str),
    NO_LETTERS: str => !(/[a-zA-Z]/g.test(str)),
    HAS_HYPHEN: str => str.includes('-'),
    ONE_CHAR: str => str.length === 1,
    NO_LOWERCASE: str => !(/[a-zA-Z]/g.test(str)) || !(/[a-z]/g.test(str)),
    NO_UPPERCASE: str => !(/[a-zA-Z]/g.test(str)) || !(/[A-Z]/g.test(str)),
    FIRST_UPPERCASE: str => str[0].toUpperCase() !== str[0].toLowerCase() && str[0].toUpperCase() === str[0]
};
const geographicalFeatures = {
    POSTAL_CODE_LABEL1: 'POSTAL_CODE_LABEL1',
    POSTAL_CODE_LABEL2: 'POSTAL_CODE_LABEL2',
    COUNTRY_LABEL: 'COUNTRY_LABEL',
    COUNTRY: 'COUNTRY',
    COUNTY_LABEL: 'COUNTY_LABEL',
    COUNTY: 'COUNTY',
    CITY_LABEL: 'CITY_LABEL',
    STREET_LABEL_OR_STREET_TYPE: 'STREET_LABEL_OR_STREET_TYPE',
    STREET_TYPE: 'STREET_TYPE',
    STREET_NUMBER_LABEL: 'STREET_NUMBER_LABEL',
    BLOCK_LABEL: 'BLOCK_LABEL',
    STAIRCASE_LABEL: 'STAIRCASE_LABEL',
    APARTMENT_LABEL: 'APARTMENT_LABEL',
    INTERCOM_LABEL: 'INTERCOM_LABEL',
    FLOOR_LABEL: 'FLOOR_LABEL'
};
const geographicalFeaturesFunctions = {
    POSTAL_CODE_LABEL1: str => ['cod', 'codul'].includes(str),
    POSTAL_CODE_LABEL2: str => str === 'postal',
    COUNTRY_LABEL: str => ['tara'].includes(str),
    COUNTRY: str => ['romania', 'ro'].includes(str),
    COUNTY_LABEL: str => ['judetul', 'judet', 'jud'].includes(str),
    COUNTY: str => ["AB", "AR", "AG", "BC", "BH", "BN", "BT", "BV", "BR", "B", "BZ", "CS", "CL", "CJ", "CT", "CV", "DB", "DJ", "GL", "GR", "GJ", "HR", "HD", "IL", "IS", "IF", "MM", "MH", "MS", "NT", "OT", "PH", "SM", "SJ", "SB", "SV", "TR", "TM", "TL", "VS", "VL", "VN", 'Bucuresti','Timis','Dolj','Prahova','Iasi','Cluj','Braila','Constanta','Sibiu','Bihor','Arad','Hunedoara','Bacau','Mures','Galati','Brasov','Mehedinti','Neamt','Vaslui','Botosani','Arges','Buzau','Satu Mare','Giurgiu','Maramures','Valcea','Suceava','Vrancea','Tulcea','Olt','Caras-Severin','Calarasi','Dambovita','Bistrita-Nasaud','Alba','Gorj','Covasna','Harghita','Teleorman','Ialomita','Salaj','Ilfov'].map(county => county.toLowerCase()).includes(str),
    CITY_LABEL: str => ["localitatea", "localitate", "localit", "loc", "satul", "sat", "comuna", "orasul", "oras", "ors", "or", "municipiul", "municipiu", "mun", "sectorul", "sector", "sec"].includes(str),
    STREET_LABEL_OR_STREET_TYPE: str => ['str', 'strd', 'strada'].includes(str),
    STREET_TYPE: str => ['alee','aleea','alee','intrare','intrarea','intr','int','fundatura','piata','piata','pta','bulevard','bulevardul','blvrd','blvd','bul','blv','bd','drum','drumul','sosea','soseaua','sos','cale','calea','cal','cartier','cartierul','cart','stradela','pasaj','pasajul','prelungire','prelungirea','fundac','fundacul','parc','parcul','splai','splaiul','spl','trecere','trecerea','ulicioara','ulita','hotar','hotarul','canton','cantonul','cvartal','cvartalul','trecatoare','trecatoarea','magistrala','curte','curtea','complex','complexul','sir','sirul','scuar','scuarul','pietonal','pietonalul'].includes(str),
    STREET_NUMBER_LABEL: str => ['numarul', 'numar', 'nr'].includes(str),
    BLOCK_LABEL: str => ["blocul", "bloc", "bl"].includes(str),
    STAIRCASE_LABEL: str => ["scara", "sc"].includes(str),
    APARTMENT_LABEL: str => ["apartamentul", "apartament", "ap", "camera", "cam"].includes(str),
    INTERCOM_LABEL: str => ["interfonul", "interfon", "int"].includes(str),
    FLOOR_LABEL: str => ["etajul", "etaj", "et"].includes(str),
};
const NGrams = natural.NGrams;
const meaningfulTokens = ['postal_code', 'country', 'county', 'city', 'street_type', 'street', 'street_number', 'block', 'staircase', 'apartment', 'intercom', 'floor'];
const meaningfulTokensToTags = {
    'postal_code': 'POSTAL_ADDRESS_POSTAL_CODE',
    'country': 'POSTAL_ADDRESS_COUNTRY',
    'county': 'POSTAL_ADDRESS_COUNTY',
    'city': 'POSTAL_ADDRESS_CITY',
    'street_type': 'POSTAL_ADDRESS_STREET_TYPE',
    'street': 'POSTAL_ADDRESS_STREET',
    'street_number': 'POSTAL_ADDRESS_STREET_NUMBER',
    'block': 'POSTAL_ADDRESS_BLOCK',
    'staircase': 'POSTAL_ADDRESS_STAIRCASE',
    'apartment': 'POSTAL_ADDRESS_APARTMENT',
    'intercom': 'POSTAL_ADDRESS_INTERCOM',
    'floor': 'POSTAL_ADDRESS_FLOOR'
};
const ax = axios.create({httpAgent: new Agent({
    keepAlive: false,
    maxSockets: 300,
    maxFreeSockets: 300,
    timeout: 60000,
    freeSocketTimeout: 30000,
})});

class RegexApproach {
    #addressRegex;
    #addressPrefixRegex;
    constructor() {
        const semicolon_or_none = ':?';
        const in_la_pe = '(?:in|la|pe)';
        const cu = '(?:cu )?';
        const a_sta_verb = "(?:" + ["stau", "stai", "sta", "stam", "stati", "stea", "stateam", "stateai", "statea", "stateati", "stateau", "statusem", "statusesi", "statuse", "statuseram", "statuserati", "statusera", "statui", "statusi", "statu", "staturam", "staturati", "statura", "stat"].join('|') + ')';
        const a_locui_verb = "(?:" + ["locuiesc", "locuiesti", "locuim", "locuiti", "locuiasca", "locuiam", "locuiai", "locuia", "locuiati", "locuiau", "locuii", "locuisi", "locui", "locuiaram", "locuiarati", "locuiara", "locuisem", "locuisesi", "locuise", "locuiseram", "locuiserati", "locuisera", "locuit"].join('|') + ')';
        const addressPrefix = "(?:" + [
            `pe domiciliul la adresa\\b${semicolon_or_none}`,
            `pe domiciliul de la adresa\b${semicolon_or_none}`,
            `pe domiciliul din adresa\\b${semicolon_or_none}`,
            `din domiciliul la adresa\\b${semicolon_or_none}`,
            `din domiciliul de la adresa\\b${semicolon_or_none}`,
            `din domiciliul din adresa\\b${semicolon_or_none}`,
            `in domiciliul la adresa\\b${semicolon_or_none}`,
            `in domiciliul de la adresa\\b${semicolon_or_none}`,
            `in domiciliul din adresa\\b${semicolon_or_none}`,
            `adresa ${in_la_pe}${semicolon_or_none}`,
            `adresa domiciliului ${in_la_pe}${semicolon_or_none}`,
            `adresa domiciliului\\b${semicolon_or_none}`,
            `adresa domiciliu\\b${semicolon_or_none}`,
            `adresa de domiciliu ${in_la_pe}${semicolon_or_none}`,
            `adresa de domiciliu\\b${semicolon_or_none}`,
            `adresa resedintei ${in_la_pe}${semicolon_or_none}`,
            `adresa resedintei\\b${semicolon_or_none}`,
            `adresa resedinta\\b${semicolon_or_none}`,
            `adresa sediului ${in_la_pe}${semicolon_or_none}`,
            `adresa sediului\\b${semicolon_or_none}`,
            `adresa sediu\\b${semicolon_or_none}`,
            `adresa\\b${semicolon_or_none}`,
            `din domiciliul\\b${semicolon_or_none}`,
            `din domiciliu\\b${semicolon_or_none}`,
            `la domiciliul\\b${semicolon_or_none}`,
            `${cu}domiciliul ${in_la_pe}${semicolon_or_none}`,
            `${cu}domiciliul la adresa\\b${semicolon_or_none}`,
            `${cu}domiciliul de la adresa\\b${semicolon_or_none}`,
            `${cu}domiciliul din adresa\\b${semicolon_or_none}`,
            `${cu}domiciliul\\b${semicolon_or_none}`,
            `${cu}domiciliu\\b${semicolon_or_none}`,
            `dimiciliata ${in_la_pe}${semicolon_or_none}`,
            `dimiciliat ${in_la_pe}${semicolon_or_none}`,
            `la resedinta\\b${semicolon_or_none}`,
            `pe resedinta\\b${semicolon_or_none}`,
            `din resedinta\\b${semicolon_or_none}`,
            `${cu}resedinta ${in_la_pe}${semicolon_or_none}`,
            `${cu}resedinta\\b${semicolon_or_none}`,
            `${cu}sediul\\b${semicolon_or_none}`,
            `${cu}sediu\\b${semicolon_or_none}`,
            `la sediul\\b${semicolon_or_none}`,
            `din sediul\\b${semicolon_or_none}`,
            `${cu}sediul ${in_la_pe}${semicolon_or_none}`,
            `${a_sta_verb} ${in_la_pe}${semicolon_or_none}`,
            `${a_locui_verb} ${in_la_pe}${semicolon_or_none}`
        ].join('|') + ")\\s";
        this.#addressPrefixRegex = new RegExp(addressPrefix, 'gi');
        const regexes = {
            street_type: '\\b(?:(?:strada|strd|str|alee|aleea|alee|intrare|intrarea|intr|int|fundatura|piata|piata|pta|bulevard|bulevardul|blvrd|blvd|bul|blv|bd|drum|drumul|sosea|soseaua|sos|cale|calea|cal|cartier|cartierul|cart|stradela|pasaj|pasajul|prelungire|prelungirea|fundac|fundacul|parc|parcul|splai|splaiul|spl|trecere|trecerea|ulicioara|ulita|hotar|hotarul|canton|cantonul|cvartal|cvartalul|trecatoare|trecatoarea|magistrala|curte|curtea|complex|complexul|sir|sirul|scuar|scuarul|pietonal|pietonalul)(?:\\s|\\.|\\:)+(?:[a-zA-Z0-9]{2,}))',
            county: '\\b(?:(?:(?:judetul|judet|jud)(?:\\s|\\.|\\:)*)?(?:Bucuresti|Timis|Dolj|Prahova|Iasi|Cluj|Braila|Constanta|Sibiu|Bihor|Arad|Hunedoara|Bacau|Mures|Galati|Brasov|Mehedinti|Neamt|Vaslui|Botosani|Arges|Buzau|Satu Mare|Giurgiu|Maramures|Valcea|Suceava|Vrancea|Tulcea|Olt|Caras-Severin|Calarasi|Dambovita|Bistrita-Nasaud|Alba|Gorj|Covasna|Harghita|Teleorman|Ialomita|Salaj|Ilfov))',
            city_type: '\\b(?:(?:municipiul|municipiu|mun|orasul|oras|ors|or|comuna|sectorul|sector|sec|localitatea|localitate|localit|loc|satul|sat)(?:\\s|\\.|\\:)+(?:[a-zA-Z0-9]{2,}))',
            street_number: '\\b(?:(?:numarul|numar|nr)(?:\\s|\\.|\\:)+(?:[0-9]+))(?:(?:\\s)*(?:bis|[a-zA-Z])\\b)?',
            floor: '\\b(?:(?:etajul|etaj|etj|et)(?:\\s|\\.|\\:)+(?:-[1-9]|-10|[0-9]|1[0-5]|p|m)|parter|demisol|mansarda)\\b',
            apartment: '\\b(?:(?:apartamentul|apartament|ap)(?:\\s|\\.|\\:)+(?:[1-9]|[1-9][0-9]{1,2}))\\b',
            country: '\\b(?:Romania)\\b',
            postal_code_text: '\\b(?:cod postal|codul postal)\\b',
            postal_code: '\\b(?:(?:0?[1-8]|[1-9][0-5])[0-9]{4})\\b'
        };
        const min = 20;
        const max = 200;
        const addressRegex1 = `(?:(?:${addressPrefix}|${regexes.street_type}|${regexes.county}|${regexes.city_type}).{${min},${max}}(?:${regexes.street_number}|${regexes.floor}|${regexes.apartment}|${regexes.country}|${regexes.postal_code}))`;
        const addressRegex2 = `(?:(?:${addressPrefix}|${regexes.postal_code_text}|${regexes.street_type}|${regexes.county}|${regexes.city_type}).{${min},${max}}(?:${regexes.street_number}|${regexes.floor}|${regexes.apartment}|${regexes.country}))`;
        const addressRegex3 = `(?:(?:${addressPrefix}|${regexes.street_type}|${regexes.city_type}).{${min},${max}}(?:${regexes.street_number}|${regexes.floor}|${regexes.apartment}|${regexes.country}|${regexes.county}|${regexes.postal_code}))`;
        const addressRegex4 = `(?:(?:${addressPrefix}|${regexes.postal_code_text}|${regexes.street_type}|${regexes.city_type}).{${min},${max}}(?:${regexes.street_number}|${regexes.floor}|${regexes.apartment}|${regexes.country}|${regexes.county}))`;
        this.#addressRegex = new RegExp(`(?:${addressRegex1}|${addressRegex2}|${addressRegex3}|${addressRegex4})`, 'gi');
    }

    extract(text) {
        return [...removeDiacritics(text).matchAll(this.#addressRegex)]
            .map(match => ({text: match[0], start: match[0] ? match.index : -1, end: match.index + match[0].length - 1}))
            .map(match => this.#removeContext(match))
            .map(res => [res.start, res.end]);
    }

    #removeContext(match) {
        const contextMatches = [...match.text.matchAll(this.#addressPrefixRegex)].map(match => ({text: match[0], start: match.index}));
        if (contextMatches.length && contextMatches[0]?.start === 0) {
            match.start += contextMatches[0].text.length;
            match.text = match.text.substring(contextMatches[0].text.length);
        }
        return match;
    }
}

class DictionaryApproach {
    #counties;
    #citiesData;
    #cities;
    #streetsData;
    #streets;
    #postalCodesData;
    #postalCodes;
    #testTokenFunctions;
    #addressPrefixes;
    #postalCodeTexts;
    #countryTexts;
    #country;
    #countyTexts;
    #cityTexts;
    #streetTexts;
    #streetTypes;
    #streetNumberTexts;
    #blockTexts;
    #staircaseTexts;
    #apartmentTexts;
    #intercomTexts;
    #floorTexts;
    constructor() {
        this.#testTokenFunctions = [
            this.#isAddressPrefix, this.#isPostalCodeText, this.#isPostalCode, this.#isCountryText, this.#isCountry, this.#isCountyText,
            this.#isCounty, this.#isCityText, this.#isCity, this.#isStreetText, this.#isStreetType, this.#isStreet, this.#isStreetNumberText,
            this.#isStreetNumber, this.#isBlockText, this.#isBlock, this.#isStaircaseText, this.#isStaircase, this.#isApartmentText, this.#isApartment,
            this.#isIntercomText, this.#isIntercom, this.#isFloorText, this.#isFloor
        ]
        this.#citiesData = [];
        this.#cities = [];
        this.#streetsData = [];
        this.#streets = [];
        this.#postalCodesData = [];
        this.#postalCodes = [];
        this.#addressPrefixes = this.#splitTexts([
            'pe domiciliul la adresa',
            'pe domiciliul de la adresa',
            'pe domiciliul din adresa',
            'din domiciliul la adresa',
            'din domiciliul de la adresa',
            'din domiciliul din adresa',
            'in domiciliul la adresa',
            'in domiciliul de la adresa',
            'in domiciliul din adresa',
            'adresa in',
            'adresa la',
            'adresa pe',
            'adresa domiciliului in',
            'adresa domiciliului la',
            'adresa domiciliului pe',
            'adresa domiciliului',
            'adresa domiciliu',
            'adresa de domiciliu in',
            'adresa de domiciliu la',
            'adresa de domiciliu pe',
            'adresa de domiciliu',
            'adresa resedintei in',
            'adresa resedintei la',
            'adresa resedintei pe',
            'adresa resedintei',
            'adresa resedinta',
            'adresa sediului in',
            'adresa sediului la',
            'adresa sediului pe',
            'adresa sediului',
            'adresa sediu',
            'adresa',
            'din domiciliul',
            'din domiciliu',
            'la domiciliul',
            'domiciliul in',
            'domiciliul la',
            'domiciliul pe',
            'domiciliul la adresa',
            'domiciliul de la adresa',
            'domiciliul din adresa',
            'domiciliul',
            'domiciliu',
            'dimiciliata in',
            'dimiciliata la',
            'dimiciliata pe',
            'dimiciliat in',
            'dimiciliat la',
            'dimiciliat pe',
            'la resedinta',
            'pe resedinta',
            'din resedinta',
            'resedinta in',
            'resedinta la',
            'resedinta pe',
            'resedinta',
            'sediul',
            'sediu',
            'la sediul',
            'din sediul',
            'sediul in',
            'sediul la',
            'sediul pe',
            'stau in',        'stai in',       'sta in',         'stam in',
            'stati in',       'stea in',       'stateam in',     'stateai in',
            'statea in',      'stateati in',   'stateau in',     'statusem in',
            'statusesi in',   'statuse in',    'statuseram in',  'statuserati in',
            'statusera in',   'statui in',     'statusi in',     'statu in',
            'staturam in',    'staturati in',  'statura in',     'stat in',
            'stau la',        'stai la',       'sta la',         'stam la',
            'stati la',       'stea la',       'stateam la',     'stateai la',
            'statea la',      'stateati la',   'stateau la',     'statusem la',
            'statusesi la',   'statuse la',    'statuseram la',  'statuserati la',
            'statusera la',   'statui la',     'statusi la',     'statu la',
            'staturam la',    'staturati la',  'statura la',     'stat la',
            'stau pe',        'stai pe',       'sta pe',         'stam pe',
            'stati pe',       'stea pe',       'stateam pe',     'stateai pe',
            'statea pe',      'stateati pe',   'stateau pe',     'statusem pe',
            'statusesi pe',   'statuse pe',    'statuseram pe',  'statuserati pe',
            'statusera pe',   'statui pe',     'statusi pe',     'statu pe',
            'staturam pe',    'staturati pe',  'statura pe',     'stat pe',
            'locuiesc in',    'locuiesti in',  'locuim in',      'locuiti in',
            'locuiasca in',   'locuiam in',    'locuiai in',     'locuia in',
            'locuiati in',    'locuiau in',    'locuii in',      'locuisi in',
            'locui in',       'locuiaram in',  'locuiarati in',  'locuiara in',
            'locuisem in',    'locuisesi in',  'locuise in',     'locuiseram in',
            'locuiserati in', 'locuisera in',  'locuit in',      'locuiesc la',
            'locuiesti la',   'locuim la',     'locuiti la',     'locuiasca la',
            'locuiam la',     'locuiai la',    'locuia la',      'locuiati la',
            'locuiau la',     'locuii la',     'locuisi la',     'locui la',
            'locuiaram la',   'locuiarati la', 'locuiara la',    'locuisem la',
            'locuisesi la',   'locuise la',    'locuiseram la',  'locuiserati la',
            'locuisera la',   'locuit la',     'locuiesc pe',    'locuiesti pe',
            'locuim pe',      'locuiti pe',    'locuiasca pe',   'locuiam pe',
            'locuiai pe',     'locuia pe',     'locuiati pe',    'locuiau pe',
            'locuii pe',      'locuisi pe',    'locui pe',       'locuiaram pe',
            'locuiarati pe',  'locuiara pe',   'locuisem pe',    'locuisesi pe',
            'locuise pe',     'locuiseram pe', 'locuiserati pe', 'locuisera pe',
            'locuit pe'
        ]);
        this.#postalCodeTexts = this.#splitTexts(['cod postal', 'codul postal'])
        this.#countryTexts = this.#splitTexts(['tara']);
        this.#country = this.#splitTexts(['romania'])
        this.#countyTexts = this.#splitTexts(['judetul', 'judet', 'jud'])
        this.#counties = this.#splitTexts(['Bucuresti','Timis','Dolj','Prahova','Iasi','Cluj','Braila','Constanta','Sibiu','Bihor','Arad','Hunedoara','Bacau','Mures','Galati','Brasov','Mehedinti','Neamt','Vaslui','Botosani','Arges','Buzau','Satu Mare','Giurgiu','Maramures','Valcea','Suceava','Vrancea','Tulcea','Olt','Caras-Severin','Calarasi','Dambovita','Bistrita-Nasaud','Alba','Gorj','Covasna','Harghita','Teleorman','Ialomita','Salaj','Ilfov'].map(county => county.toLowerCase()));
        this.#cityTexts = this.#splitTexts(["localitatea", "localitate", "localit", "loc", "satul", "sat", "comuna", "orasul", "oras", "ors", "or", "municipiul", "municipiu", "mun", "sectorul", "sector", "sec"]);
        this.#streetTexts = this.#splitTexts(['str', 'strd', 'strada']);
        this.#streetTypes = this.#splitTexts(['strada','strd','str','alee','aleea','alee','intrare','intrarea','intr','int','fundatura','piata','piata','pta','bulevard','bulevardul','blvrd','blvd','bul','blv','bd','drum','drumul','sosea','soseaua','sos','cale','calea','cal','cartier','cartierul','cart','stradela','pasaj','pasajul','prelungire','prelungirea','fundac','fundacul','parc','parcul','splai','splaiul','spl','trecere','trecerea','ulicioara','ulita','hotar','hotarul','canton','cantonul','cvartal','cvartalul','trecatoare','trecatoarea','magistrala','curte','curtea','complex','complexul','sir','sirul','scuar','scuarul','pietonal','pietonalul']);
        this.#streetNumberTexts = this.#splitTexts(['numarul', 'numar', 'nr']);
        this.#blockTexts = this.#splitTexts(["blocul", "bloc", "bl"]);
        this.#staircaseTexts = this.#splitTexts(["scara", "sc"]);
        this.#apartmentTexts = this.#splitTexts(["apartamentul", "apartament", "ap", "camera", "cam"]);
        this.#intercomTexts = this.#splitTexts(["interfonul", "interfon", "int"]);
        this.#floorTexts = this.#splitTexts(["etajul", "etaj", "et"]);
    }

    #splitTexts(texts) {
        return texts.map(text => [...text.matchAll(everythingButSeparatorsRegex)].map(match => match[0].toLowerCase()));
    }

    async init() {
        await new Promise(resolve => {
            fs.createReadStream(path.resolve(__dirname, `./datasets/siruta.csv`))
                .pipe(parse({headers: true}))
                .on('error', error => console.error(error))
                .on('data', row => {
                    const postalCode = row.postal_code;
                    if (postalCode !== "0") {
                        this.#postalCodesData.push({
                            postalCode: postalCode,
                            siruta: row.siruta,
                            type: row.type,
                            city: row.name
                        });
                        this.#postalCodes.push([postalCode]);
                        if (postalCode.length === 5) {
                            this.#postalCodesData.push({
                                postalCode: `0${postalCode}`,
                                siruta: row.siruta,
                                type: row.type,
                                city: row.name
                            });
                            this.#postalCodes.push([`0${postalCode}`]);
                        }
                    }
                    if (row.type !== 'judet' && !_.flatten(this.#counties).includes(row.name.toLowerCase())) {
                        this.#citiesData.push({
                            city: row.name,
                            siruta: row.siruta,
                            type: row.type
                        });
                        this.#cities.push(...this.#splitTexts([row.name.toLowerCase()]));
                    }
                })
                .on('end', () => {
                    this.#cities.push(['bucuresti']);
                    resolve();
                });
        });
        await new Promise(resolve => {
            fs.createReadStream(path.resolve(__dirname, `./datasets/streets_cities.csv`))
                .pipe(parse({headers: true}))
                .on('error', error => console.error(error))
                .on('data', row => {
                    if (!isNaN(row.name)) {
                        return;
                    }
                    Object.keys(diacriticsReplacementMap).forEach(charToReplace => {
                        row.name = row.name.replaceAll(charToReplace, diacriticsReplacementMap[charToReplace]);
                    });
                    this.#streetsData.push({
                        street: row.name,
                        siruta: row.siruta,
                        type: row.type
                    });
                    this.#streets.push(...this.#splitTexts([row.name.toLowerCase()]));
                })
                .on('end', () => {
                    resolve();
                });
        });
        await new Promise(resolve => {
            fs.createReadStream(path.resolve(__dirname, `./datasets/streets_communes.csv`))
                .pipe(parse({headers: true}))
                .on('error', error => console.error(error))
                .on('data', row => {
                    if (!isNaN(row.name)) {
                        return;
                    }
                    Object.keys(diacriticsReplacementMap).forEach(charToReplace => {
                        row.name = row.name.replaceAll(charToReplace, diacriticsReplacementMap[charToReplace]);
                    });
                    this.#streetsData.push({
                        street: row.name,
                        siruta: row.siruta,
                        type: row.type
                    });
                    this.#streets.push(...this.#splitTexts([row.name.toLowerCase()]));
                })
                .on('end', () => {
                    resolve();
                });
        });
        await new Promise(resolve => {
            fs.createReadStream(path.resolve(__dirname, `./datasets/streets_villages.csv`))
                .pipe(parse({headers: true}))
                .on('error', error => console.error(error))
                .on('data', row => {
                    if (!isNaN(row.name)) {
                        return;
                    }
                    Object.keys(diacriticsReplacementMap).forEach(charToReplace => {
                        row.name = row.name.replaceAll(charToReplace, diacriticsReplacementMap[charToReplace]);
                    });
                    this.#streetsData.push({
                        street: row.name,
                        siruta: row.siruta,
                        type: row.type
                    });
                    this.#streets.push(...this.#splitTexts([row.name.toLowerCase()]));
                })
                .on('end', () => {
                    resolve();
                });
        });
    }

    extract(text) {
        const data = {text: removeDiacritics(text)};
        this.#tokenize(data);
        return this.#process(data.tokens_original, this.#getTokensGroups(data));
    }

    #tokenize(data) {
        data.tokens_original = [...data.text.matchAll(everythingButSeparatorsRegexForDictionary)].map(match => ({text: match[0].toLowerCase(), start: match[0] ? match.index : -1, end: match.index + match[0].length - 1})).filter(token => token.start !== -1);
        data.tokens = data.tokens_original.map(token => token.text);
    }

    #getTokensGroups(realPositiveRecord) {
        for (let i = 0; i < realPositiveRecord.tokens.length; i++) {
            realPositiveRecord.tokens[i] = {index: i, text: realPositiveRecord.tokens[i], partOfAddress: null, types: []};
        }

        let tokensGroups = [];
        for (let i = 0; i < realPositiveRecord.tokens.length; i++) {
            const tokens = realPositiveRecord.tokens.slice(i);
            const result = this.#characterize(tokens);
            if (result) {
                i = result[0].end;
                tokensGroups.push({
                    start: i,
                    end: result[0].end,
                    types: result.map(r => r.type)
                });
            } else {
                tokensGroups.push({
                    start: i,
                    end: i,
                    types: []
                });
            }
        }

        const tokenGroupsLength = tokensGroups.length;

        // Remove useless unrealistic types from tokens, by using the following belief:
        // "after token with type X, is followed by a token with type Y, and Y is a successor for X => the token with type Y can only have the Y type"
        const nonAddressTokensInBetween = 1;
        for (let i = 0; i < tokenGroupsLength; i++) {
            const currentTokenGroup = tokensGroups[i];
            if (!currentTokenGroup.types.length) {
                continue;
            }
            const aux = tokensGroups.slice(i + 1).findIndex(tg => tg.types.length);
            if (aux === -1 || aux > nonAddressTokensInBetween) {
                continue;
            }
            i = i + aux;
            const nextTokenGroup = tokensGroups[i + 1];
            for (const type of currentTokenGroup.types) {
                const successorTypes = successions[type];
                if (_.intersection(successorTypes, nextTokenGroup.types).length) {
                    const remainingTypes = _.intersection(successorTypes, nextTokenGroup.types);
                    for (let j = nextTokenGroup.start; j < nextTokenGroup.end + 1; j++) {
                        realPositiveRecord.tokens[j].types = remainingTypes;
                    }
                    nextTokenGroup.types = remainingTypes;
                }
            }
        }

        // Remove wrong tokens type by using the following belief:
        // "if the token type is X, and the X successor type is Y => the next token must be of type Y, otherwise remove the type X from the token"
        for (let i = 0; i < tokenGroupsLength; i++) {
            const currentTokenGroup = tokensGroups[i];
            if (!currentTokenGroup.types.length) {
                continue;
            }
            const aux = tokensGroups.slice(i + 1).findIndex(tg => tg.types.length);
            if (aux > nonAddressTokensInBetween) {
                continue;
            }
            let nextTokenGroup;
            if (aux === -1) {
                nextTokenGroup = {types: []};
            } else {
                i = i + aux;
                nextTokenGroup = tokensGroups[i + 1];
            }
            const types = [...currentTokenGroup.types];
            for (const type of types) {
                // if in the next token types do not contain the mandatory types => remove current token type
                const successorTypes = mandatorySuccessions[type];
                if (!successorTypes) {
                    continue;
                }
                if (!_.intersection(successorTypes, nextTokenGroup.types).length) {
                    currentTokenGroup.types = currentTokenGroup.types.filter(t => t !== type);
                    for (let j = currentTokenGroup.start; j < currentTokenGroup.end + 1; j++) {
                        realPositiveRecord.tokens[j].types = realPositiveRecord.tokens[j].types.filter(t => t !== type);
                        if (!realPositiveRecord.tokens[j].types.length) {
                            realPositiveRecord.tokens[j].partOfAddress = false;
                        }
                    }
                }
            }
        }

        // Remove wrong tokens type by using the following belief:
        // "if the token type is X, and the X predecesor type is Y => the previous token must be of type Y, otherwise remove the type X from the token"
        const reversedTokenGroups = tokensGroups.slice().reverse();
        for (let i = 0; i < tokenGroupsLength; i++) {
            const currentTokenGroup = tokensGroups[tokenGroupsLength - 1 - i];
            if (!currentTokenGroup.types.length) {
                continue;
            }
            const aux = reversedTokenGroups.slice(i + 1).findIndex(tg => tg.types.length);
            let prevTokenGroup;
            if (aux === -1 || aux > nonAddressTokensInBetween) {
                prevTokenGroup = {types: []};
            } else {
                i = i + aux;
                prevTokenGroup = tokensGroups[tokenGroupsLength - 1 - (i + 1)];
            }
            const types = [...currentTokenGroup.types];
            for (const type of types) {
                // if in the next token types do not contain the mandatory types => remove current token type
                const predecesorTypes = mandatoryPredecessors[type];
                if (!predecesorTypes) {
                    continue;
                }
                if (!_.intersection(predecesorTypes, prevTokenGroup.types).length) {
                    currentTokenGroup.types = currentTokenGroup.types.filter(t => t !== type);
                    for (let j = currentTokenGroup.start; j < currentTokenGroup.end + 1; j++) {
                        realPositiveRecord.tokens[j].types = realPositiveRecord.tokens[j].types.filter(t => t !== type);
                        if (!realPositiveRecord.tokens[j].types.length) {
                            realPositiveRecord.tokens[j].partOfAddress = false;
                        }
                    }
                }
            }
        }

        for (let i = 0; i < tokenGroupsLength; i++) {
            if (tokensGroups[i].types.includes(tokenTypes.ADDRESS_PREFIX)) {
                tokensGroups[i].types = tokensGroups[i].types.filter(t => t !== tokenTypes.ADDRESS_PREFIX);
                if (i < tokenGroupsLength - 1) {
                    tokensGroups[i + 1].possibleStart = true;
                }
            }
        }

        // Because of the previous step, we need to break the token groups,
        // that now have no types and the start and end is not equal,
        // into tokens with start and end equal to each other
        const newTokensGroups = [];
        for (let i = 0; i < tokenGroupsLength; i++) {
            if (!tokensGroups[i].types.length && tokensGroups[i].start < tokensGroups[i].end) {
                for (let j = tokensGroups[i].start; j <= tokensGroups[i].end; j++) {
                    newTokensGroups.push({
                        start: j,
                        end: j,
                        types: []
                    });
                }
            } else {
                newTokensGroups.push(tokensGroups[i]);
            }
        }
        tokensGroups = newTokensGroups;

        return tokensGroups;
    }

    #characterize(tokens) {
        let results = [];
        let maxNrOfTokens = -1;
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < this.#testTokenFunctions.length; i++) {
            const result = this.#testTokenFunctions[i].bind(this)(tokens);

            if (result) {
                if (result.tokensCount > maxNrOfTokens) {
                    maxNrOfTokens = result.tokensCount;
                    minDistance = result.distance;
                    results = [result];
                } else if (result.tokensCount === maxNrOfTokens) {
                    if (result.distance < minDistance) {
                        minDistance = result.distance;
                        results = [result];
                    } else if (result.distance === minDistance) {
                        results.push(result);
                    }
                }
            }
        }
        if (results.length) {
            return results;
        } else {
            return null;
        }
    }

    #template(arrayOfTokens, tokens, type, maxDistance) {
        const {index, dist} = this.#findMatchingStringsArray(arrayOfTokens, tokens.map(t => t.text), maxDistance);
        if (index === -1) {
            return null;
        } else {
            const length = arrayOfTokens[index].length;
            for (let i = 0; i < length; i++) {
                tokens[i].partOfAddress = true;
                tokens[i].types.push(type);
            }
            return {
                type: type,
                tokensCount: length,
                distance: dist,
                end: tokens[length - 1].index
            };
        }
    }

    #findMatchingStringsArray(arraysOfStrings, strings, maxDistance) {
        let indexesOfTheMatchedArrayOfStrings = [];
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < arraysOfStrings.length; i++) {
            const dist = this.#matchingArraysElements(arraysOfStrings[i], strings, maxDistance);
            if (dist !== -1) {
                if (dist < minDistance) {
                    indexesOfTheMatchedArrayOfStrings = [i];
                    minDistance = dist;
                } else if (dist === minDistance) {
                    indexesOfTheMatchedArrayOfStrings.push(i);
                }
            }
        }
        if (indexesOfTheMatchedArrayOfStrings.length) {
            return {index: indexesOfTheMatchedArrayOfStrings[0], dist: minDistance};
        } else {
            return {index: -1, dist: null};
        }
    }

    #matchingArraysElements(stringsToBeMatched, strings, maxDistance) {
        let distanceSum = 0;
        for (let i = 0; i < stringsToBeMatched.length; i++) {
            if (stringsToBeMatched[i] !== strings[i]) {
                if (!strings[i]) {
                    return -1;
                }
                const dist = distance(stringsToBeMatched[i], strings[i]);
                if (dist <= maxDistance) {
                    distanceSum += dist;
                } else {
                    return -1;
                }
            }
        }
        return distanceSum;
    }

    #isAddressPrefix(tokens) {
        return this.#template(this.#addressPrefixes, tokens, tokenTypes.ADDRESS_PREFIX, 1);
    }

    #isPostalCodeText(tokens) {
        return this.#template(this.#postalCodeTexts, tokens, tokenTypes.POSTAL_CODE_TEXT, 0);
    }

    #isPostalCode(tokens) {
        return this.#template(this.#postalCodes, tokens, tokenTypes.POSTAL_CODE, 0);
    }

    #isCountryText(tokens) {
        return this.#template(this.#countryTexts, tokens, tokenTypes.COUNTRY_TEXT, 0);
    }

    #isCountry(tokens) {
        return this.#template(this.#country, tokens, tokenTypes.COUNTRY, 0);
    }

    #isCountyText(tokens) {
        return this.#template(this.#countyTexts, tokens, tokenTypes.COUNTY_TEXT, 0);
    }

    #isCounty(tokens) {
        return this.#template(this.#counties, tokens, tokenTypes.COUNTY, 1);
    }

    #isCityText(tokens) {
        return this.#template(this.#cityTexts, tokens, tokenTypes.CITY_TEXT, 0);
    }

    #isCity(tokens) {
        return this.#template(this.#cities, tokens, tokenTypes.CITY, 0);
    }

    #isStreetText(tokens) {
        return this.#template(this.#streetTexts, tokens, tokenTypes.STREET_TEXT, 0);
    }

    #isStreetType(tokens) {
        return this.#template(this.#streetTypes, tokens, tokenTypes.STREET_TYPE, 0);
    }

    #isStreet(tokens) {
        return this.#template(this.#streets, tokens, tokenTypes.STREET, 0);
    }

    #isStreetNumberText(tokens) {
        return this.#template(this.#streetNumberTexts, tokens, tokenTypes.STREET_NUMBER_TEXT, 0);
    }

    #isStreetNumber(tokens) {
        if (!isNaN(tokens[0].text)) { // if number
            if (parseInt(tokens[0].text) <= 999) { // if number below 999
                if (tokens[1] && (tokens[1].text === 'bis' || (tokens[1].text.length === 1 && this.#charIsLetter(tokens[1].text)))) {
                    tokens[0].partOfAddress = true;
                    tokens[0].types.push(tokenTypes.STREET_NUMBER);
                    tokens[1].partOfAddress = true;
                    tokens[1].types.push(tokenTypes.STREET_NUMBER);
                    return {
                        type: tokenTypes.STREET_NUMBER,
                        tokensCount: 2,
                        distance: 0,
                        end: tokens[1].index
                    };
                } else {
                    tokens[0].partOfAddress = true;
                    tokens[0].types.push(tokenTypes.STREET_NUMBER);
                    return {
                        type: tokenTypes.STREET_NUMBER,
                        tokensCount: 1,
                        distance: 0,
                        end: tokens[0].index
                    };
                }
            } else {
                return null;
            }
        } else { // if not number
            if (tokens[0].text.slice(-3) === 'bis') {
                if (!isNaN(tokens[0].text.slice(0, -3))) {
                    tokens[0].partOfAddress = true;
                    tokens[0].types.push(tokenTypes.STREET_NUMBER);
                    return {
                        type: tokenTypes.STREET_NUMBER,
                        tokensCount: 1,
                        distance: 0,
                        end: tokens[0].index
                    };
                } else {
                    return null;
                }
            } else if (this.#charIsLetter(tokens[0].text.slice(-1))) {
                if (!isNaN(tokens[0].text.slice(0, -1))) {
                    tokens[0].partOfAddress = true;
                    tokens[0].types.push(tokenTypes.STREET_NUMBER);
                    return {
                        type: tokenTypes.STREET_NUMBER,
                        tokensCount: 1,
                        distance: 0,
                        end: tokens[0].index
                    };
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
    }

    #isBlockText(tokens) {
        return this.#template(this.#blockTexts, tokens, tokenTypes.BLOCK_TEXT, 0);
    }

    #isBlock(tokens) {
        if ((!isNaN(tokens[0].text) && parseInt(tokens[0].text) <= 10) ||
            (tokens[0].text.length === 1 && this.#charIsLetter(tokens[0].text)) ||
            (this.#charIsLetter(tokens[0].text[0]) && !isNaN(tokens[0].text.slice(1)) && parseInt(tokens[0].text.slice(1)) <= 10) ||
            (this.#charIsLetter(tokens[0].text.slice(-1)) && !isNaN(tokens[0].text.slice(0, -1)) && parseInt(tokens[0].text.slice(0, -1)) <= 10)) {
            tokens[0].partOfAddress = true;
            tokens[0].types.push(tokenTypes.BLOCK);
            return {
                type: tokenTypes.BLOCK,
                tokensCount: 1,
                distance: 0,
                end: tokens[0].index
            };
        } else {
            return null;
        }
    }

    #isStaircaseText(tokens) {
        return this.#template(this.#staircaseTexts, tokens, tokenTypes.STAIRCASE_TEXT, 0);
    }

    #isStaircase(tokens) {
        if ((!isNaN(tokens[0].text) && parseInt(tokens[0].text) <= 10) ||
            (tokens[0].text.length === 1 && this.#charIsLetter(tokens[0].text)) ||
            (this.#charIsLetter(tokens[0].text[0]) && !isNaN(tokens[0].text.slice(1)) && parseInt(tokens[0].text.slice(1)) <= 10) ||
            (this.#charIsLetter(tokens[0].text.slice(-1)) && !isNaN(tokens[0].text.slice(0, -1)) && parseInt(tokens[0].text.slice(0, -1)) <= 10)) {
            tokens[0].partOfAddress = true;
            tokens[0].types.push(tokenTypes.STAIRCASE);
            return {
                type: tokenTypes.STAIRCASE,
                tokensCount: 1,
                distance: 0,
                end: tokens[0].index
            };
        } else {
            return null;
        }
    }

    #isApartmentText(tokens) {
        return this.#template(this.#apartmentTexts, tokens, tokenTypes.APARTMENT_TEXT, 0);
    }

    #isApartment(tokens) {
        if (!isNaN(tokens[0].text) && parseInt(tokens[0].text) <= 999) {
            tokens[0].partOfAddress = true;
            tokens[0].types.push(tokenTypes.APARTMENT);
            return {
                type: tokenTypes.APARTMENT,
                tokensCount: 1,
                distance: 0,
                end: tokens[0].index
            };
        } else {
            return null;
        }
    }

    #isIntercomText(tokens) {
        return this.#template(this.#intercomTexts, tokens, tokenTypes.INTERCOM_TEXT, 0);
    }

    #isIntercom(tokens) {
        if (!isNaN(tokens[0].text)) {
            if (parseInt(tokens[0].text) <= 999) {
                tokens[0].partOfAddress = true;
                tokens[0].types.push(tokenTypes.INTERCOM);
                return {
                    type: tokenTypes.INTERCOM,
                    tokensCount: 1,
                    distance: 0,
                    end: tokens[0].index
                };
            } else if (tokens[0].text.length === 2 && tokens[0].text[0] === '0') {
                tokens[0].partOfAddress = true;
                tokens[0].types.push(tokenTypes.INTERCOM);
                return {
                    type: tokenTypes.INTERCOM,
                    tokensCount: 1,
                    distance: 0,
                    end: tokens[0].index
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    #isFloorText(tokens) {
        return this.#template(this.#floorTexts, tokens, tokenTypes.FLOOR_TEXT, 0);
    }

    #isFloor(tokens) {
        if (['subsol', 'parter', 'p'].includes(tokens[0].text) || (parseInt(tokens[0].text) <= 15 && parseInt(tokens[0].text) > -3)) {
            tokens[0].partOfAddress = true;
            tokens[0].types.push(tokenTypes.FLOOR);
            return {
                type: tokenTypes.FLOOR,
                tokensCount: 1,
                distance: 0,
                end: tokens[0].index
            };
        } else {
            return null;
        }
    }

    #charIsLetter(char) {
        if (typeof char !== 'string') {
            return false;
        }

        return char.toLowerCase() !== char.toUpperCase();
    }

    #process(tokens_original, tokensGroups) {
        const arrIndexes = [];
        let temp = [];
        let nrNotOkTokenFromLastPositiveVal = 0;
        for (let i = 0; i < tokensGroups.length; i++) {
            const currentVal = tokensGroups[i];
            if (currentVal.types.length > 0 || currentVal.possibleStart) {
                temp.push({i, v: currentVal});
                nrNotOkTokenFromLastPositiveVal = 0;
            } else {
                if (temp.length) {
                    nrNotOkTokenFromLastPositiveVal++;
                    if (nrNotOkTokenFromLastPositiveVal <= 2) {
                        temp.push({i, v: currentVal});
                    } else {
                        let {__, tokensTypesOccurrences} = this.#stats(0, temp.map(t => t.v), 2);
                        if (temp.filter(t => t.v.types.length > 0 || t.v.possibleStart).length >= 3 && !mandatoryTypes.some(mandatoryType => !Object.keys(tokensTypesOccurrences).includes(mandatoryType))) {
                            arrIndexes.push(temp);
                        }
                        temp = [];
                        nrNotOkTokenFromLastPositiveVal = 0;
                    }
                }
            }
        }

        for (let i = 0; i < arrIndexes.length; i++) {
            const indexes = arrIndexes[i];
            const indexesRev = indexes.slice().reverse();
            const f = indexesRev.findIndex(idx => idx.v.types.length > 0 || idx.v.possibleStart);
            if (f > 0) {
                arrIndexes[i] = indexes.slice(0, f * -1);
            }
        }

        const textsStartsEnds = [];
        for (let i = 0; i < arrIndexes.length; i++) {
            const indexes = arrIndexes[i];

            const s = indexes[0].i;
            const e = indexes[indexes.length - 1].i;

            const start = tokensGroups[s].start;
            const end = tokensGroups[e].end;

            const startChar = tokens_original[start].start;
            const endChar = tokens_original[end].end;

            textsStartsEnds.push([startChar, endChar]);
        }

        return textsStartsEnds;
    }

    #stats(idx, tokensGroups, nonAddressTokensInBetween) {
        const tokensTypesOccurrences = {};
        let i;
        for (i = idx; i < tokensGroups.length; i++) {
            const currentTokenGroup = tokensGroups[i];
            if (currentTokenGroup.possibleStart) {
                continue;
            }
            if (!currentTokenGroup.types.length) {
                break;
            }
            for (let j = 0; j < currentTokenGroup.types.length; j++) {
                const currentType = currentTokenGroup.types[j];
                if (!tokensTypesOccurrences[currentType]) {
                    tokensTypesOccurrences[currentType] = {
                        allowedOccurrencesCount: currentTokenGroup.types.length,
                        occurrencesCount: 1
                    };
                } else {
                    if (tokensTypesOccurrences[currentType].occurrencesCount < tokensTypesOccurrences[currentType].allowedOccurrencesCount) {
                        tokensTypesOccurrences[currentType].occurrencesCount++;
                        tokensTypesOccurrences[currentType].allowedOccurrencesCount += currentTokenGroup.types.length - 1;
                    } else {
                        break;
                    }
                }
            }
            const aux = tokensGroups.slice(i + 1).findIndex(tg => tg.types.length);
            if (aux === -1 || aux > nonAddressTokensInBetween) {
                continue;
            }
            i = i + aux;
        }

        return {i, tokensTypesOccurrences};
    }

    ner(text) {
        const data = {text: removeDiacritics(text)};

        this.#tokenize(data);

        const tokensGroups = this.#getTokensGroups(data);

        return tokensGroups.filter(tg => tg.types.length && tg.types.some(t => meaningfulTokens.includes(t))).map(t => ({
            start: data.tokens_original[t.start].start,
            end: data.tokens_original[t.end].end,
            types: t.types.filter(tt => meaningfulTokens.includes(tt))
        }));
    }
}

module.exports = class Extractor_ADDRESS {
    #regexApproach;
    #dictionaryApproach;
    constructor() {
        this.#regexApproach = new RegexApproach();
        this.#dictionaryApproach = new DictionaryApproach();
    }

    init() {
        return this.#dictionaryApproach.init();
    }

    async extract(text) {
        const data = {text: removeDiacritics(text)};

        this.#tokenize(data);

        const regexApproachPredictions = this.#regexApproach.extract(text);
        const dictionaryApproachPredictions = this.#dictionaryApproach.extract(text);

        this.#featuresExtraction(data, regexApproachPredictions, dictionaryApproachPredictions);

        this.#nGram(data);
        const [features, values] = this.#getFeaturesAndValues(data);

        const predValues = await this.#predicting(features);

        let {arrIndexes, scores} = this.#getIndexesAndScores(data, predValues);

        let arr = [];
        for (let i = 0; i < regexApproachPredictions.length; i++) {
            arr.push({
                type: 'S',
                origin: 'R',
                index: regexApproachPredictions[i][0],
                score: 0
            });
            arr.push({
                type: 'E',
                origin: 'R',
                index: regexApproachPredictions[i][1],
                score: 0
            });
        }
        for (let i = 0; i < dictionaryApproachPredictions.length; i++) {
            arr.push({
                type: 'S',
                origin: 'G',
                index: dictionaryApproachPredictions[i][0],
                score: 0
            });
            arr.push({
                type: 'E',
                origin: 'G',
                index: dictionaryApproachPredictions[i][1],
                score: 0
            });
        }
        for (let i = 0; i < arrIndexes.length; i++) {
            arr.push({
                type: 'S',
                origin: 'H',
                index: arrIndexes[i][0].i,
                score: scores[i]
            });
            arr.push({
                type: 'E',
                origin: 'H',
                index: arrIndexes[i][arrIndexes[i].length - 1].i,
                score: scores[i]
            });
        }

        arr = _.orderBy(arr, ['index'], ['asc']);

        const idxs = [];
        let currentState = 0;
        let start = -1;
        let end = -1;
        for (let i = 0; i < arr.length; i++) {
            const obj = arr[i];
            if (currentState === 0) {
                if (obj.type === 'S') {
                    if (start === -1) {
                        start = i;
                    } else {
                        idxs.push([start, end]);
                        start = i;
                        end = -1;
                    }
                    currentState = 1;
                } else {
                    end = i;
                }
            } else {
                if (obj.type === 'E') {
                    currentState = 0;
                    end = i;
                }
            }
        }

        if (start !== -1) {
            idxs.push([start, end]);
        }

        const finalResult = [];
        for (let i = 0; i < idxs.length; i++) {
            const idx = idxs[i];
            let nrS = 0;
            let scores = [];
            let nrChars = arr[idx[1]].index - arr[idx[0]].index;
            for (let j = idx[0]; j < idx[1] + 1; j++) {
                if (arr[j].type === 'S') {
                    nrS++;
                }
                if (arr[j].score) {
                    scores.push(arr[j].score);
                } else {
                    if (arr[j].type === 'S') {
                        scores.push(1 - ((arr[j].index - arr[idx[0]].index) / nrChars));
                    } else {
                        scores.push(1 - ((arr[idx[1]].index - arr[j].index) / nrChars));
                    }
                }
            }
            if (nrS >= 2 || arr[idx[0]].origin === 'H') {
                finalResult.push({
                    start: arr[idx[0]].index,
                    end: arr[idx[1]].index,
                    score: _.mean(scores)
                });
            }
        }

        for (let i = 0; i < finalResult.length; i++) {
            finalResult[i].tokens = this.#dictionaryApproach.ner(text.slice(finalResult[i].start, finalResult[i].end)).map(t => {
                t.start += finalResult[i].start;
                t.end += finalResult[i].end;
                t.types = t.types.map(type => meaningfulTokensToTags[type])
                return t;
            });
        }

        return finalResult.filter(r => r.score >= 0.5);
    }

    #tokenize(data) {
        data.tokens = [...data.text.matchAll(everythingButSeparatorsRegex)].map(match => ({text: match[0], start: match[0] ? match.index : -1, end: match.index + match[0].length - 1})).filter(token => token.start !== -1);
        data.tokens_original = data.tokens;
    }

    #featuresExtraction(row, regexResult, gazetteerResult) {
        for (let idx = 0; idx < row.tokens_original.length; idx++) {
            const t = row.tokens_original[idx];
            const token = t.text;

            const features = {
                'NO_DIGITS': 0,
                'NO_LETTERS': 0,
                'HAS_HYPHEN': 0,
                'ONE_CHAR': 0,
                'NO_LOWERCASE': 0,
                'NO_UPPERCASE': 0,
                'FIRST_UPPERCASE': 0,
                'GEO': 0,
                'REGEX_PRED': 0,
                'GAZETTEER_PRED': 0
            };

            if (token !== null) {
                for (const feature of Object.keys(wordFeatures)) {
                    if (wordFeaturesFunctions[feature](token)) {
                        features[feature] = 1;
                    }
                }

                const geoFeatures = Object.keys(geographicalFeatures);
                for (let i = 0; i < geoFeatures.length; i++) {
                    if (geographicalFeaturesFunctions[geoFeatures[i]](token.toLowerCase())) {
                        features.GEO = i + 1;
                        break;
                    }
                }
            }

            for (let i = 0; i < regexResult.length; i++) {
                const res = regexResult[i];
                if (t.start === res[0] || (t.start < res[0] && t.end >= res[0])) {
                    features.REGEX_PRED = 1;
                    break;
                } else if (t.end === res[1] || (t.start <= res[1] && t.end > res[1])) {
                    features.REGEX_PRED = 2;
                    break;
                } else if (t.start > res[0] && t.start < res[1]) {
                    features.REGEX_PRED = 3;
                    break;
                }
            }

            for (let i = 0; i < gazetteerResult.length; i++) {
                const res = gazetteerResult[i];
                if (t.start === res[0] || (t.start < res[0] && t.end >= res[0])) {
                    features.GAZETTEER_PRED = 1;
                    break;
                } else if (t.end === res[1] || (t.start <= res[1] && t.end > res[1])) {
                    features.GAZETTEER_PRED = 2;
                    break;
                } else if (t.start > res[0] && t.start < res[1]) {
                    features.GAZETTEER_PRED = 3;
                    break;
                }
            }

            t.features = features;
            t.type = 0; // OTHER
        }
    }

    #nGram(data) {
        const padding = {
            features: {
                'NO_DIGITS': 0,
                'NO_LETTERS': 0,
                'HAS_HYPHEN': 0,
                'ONE_CHAR': 0,
                'NO_LOWERCASE': 0,
                'NO_UPPERCASE': 0,
                'FIRST_UPPERCASE': 0,
                'GEO': 0,
                'REGEX_PRED': 0,
                'GAZETTEER_PRED': 0
            },
            type: 0 // OTHER
        };

        if (data.tokens_original.length >= 5) {
            data.ngrams = NGrams.ngrams(data.tokens_original, 5, padding, padding);
        } else {
            data.ngrams = [];
            const withStartPadding = NGrams.ngrams(data.tokens_original, 5, padding, null);
            for (let i = 0; i < withStartPadding.length; i++) {
                if (withStartPadding[i].length < 5) {
                    withStartPadding[i].push(...Array(5 - withStartPadding[i].length).fill(padding));
                }
                data.ngrams.push(withStartPadding[i]);
            }
            const withEndPadding = NGrams.ngrams(data.tokens_original, 5, null, padding);
            for (let i = 0; i < withEndPadding.length; i++) {
                if (withEndPadding[i].length >= 5) {
                    data.ngrams.push(withEndPadding[i]);
                }
            }
        }
    }

    #getFeaturesAndValues(data) {
        const features1 = [];
        const vals = [];
        for (const ngram of data.ngrams) {
            const features = [];
            ngram.forEach(ng => {
                features.push(...Object.values(ng.features));
            });
            features1.push(features);
            vals.push(ngram[2].type);
        }

        return [features1, vals];
    }

    #predicting(features) {
        return ax.post('http://localhost:9999', {features: features}).then(res => res.data.prediction);
    }

    #getIndexesAndScores(data, predictedValues) {
        const arrIndexes = [];
        let temp = [];
        let nrNotOkTokenFromLastPositiveVal = 0;
        for (let i = 0; i < predictedValues.length; i++) {
            const currentVal = predictedValues[i];
            if (currentVal > 0) {
                temp.push({i, v: currentVal});
                nrNotOkTokenFromLastPositiveVal = 0;
            } else {
                if (temp.length) {
                    nrNotOkTokenFromLastPositiveVal++;
                    if (nrNotOkTokenFromLastPositiveVal <= 2) {
                        temp.push({i, v: currentVal});
                    } else {
                        if (temp.filter(t => t.v > 0).length >= 3) {
                            arrIndexes.push(temp);
                        }
                        temp = [];
                        nrNotOkTokenFromLastPositiveVal = 0;
                    }
                }
            }
        }

        for (let i = 0; i < arrIndexes.length; i++) {
            const indexes = arrIndexes[i];
            const indexesRev = indexes.slice().reverse();
            const f = indexesRev.findIndex(idx => idx.v > 0);
            if (f > 0) {
                arrIndexes[i] = indexes.slice(0, f * -1);
            }
        }

        const scores = [];
        for (let i = 0; i < arrIndexes.length; i++) {
            const indexes = arrIndexes[i];
            let findIdx1 = indexes.findIndex(idx => idx.v === 1);
            if (findIdx1 > 1) {
                findIdx1 = -1;
            }
            let findIdx2 = indexes.slice().reverse().findIndex(idx => idx.v === 2);
            if (findIdx2 > 1) {
                findIdx2 = -1;
            }

            let startBetween1and2 = findIdx1 < 0 ? 0 : findIdx1 + 1;
            let endBetween1and2 = findIdx2 < 0 ? indexes.length - 1 : indexes.length - 1 - findIdx2 - 1

            let startScore = 0;
            if (findIdx1 === 0 && findIdx2 === 0) {
                startScore = 0.8;
            } else if ((findIdx1 === 0 && findIdx2 === 1) || (findIdx1 === 1 && findIdx2 === 0)) {
                startScore = 0.6;
            } else if ((findIdx1 === 0 && findIdx2 === -1) || (findIdx1 === -1 && findIdx2 === 0)) {
                startScore = 0.4;
            } else if ((findIdx1 === 1 && findIdx2 === -1) || (findIdx1 === -1 && findIdx2 === 1)) {
                startScore = 0.2;
            } else {
                startScore = 0;
            }

            const nrInBetween = endBetween1and2 - startBetween1and2 + 1;
            const totalNumberOfPositivesInBetween = indexes.slice(startBetween1and2, endBetween1and2 + 1).filter(v => v.v > 0).length;

            const score = startScore + ((totalNumberOfPositivesInBetween / nrInBetween) * 0.2);
            scores.push(score);
        }

        return {arrIndexes, scores};
    }
}
