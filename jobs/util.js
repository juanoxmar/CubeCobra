const normalizeName = (name) =>
  name
    .trim()
    .normalize('NFD') // convert to consistent unicode format
    .replace(/[\u0300-\u036f]/g, '') // remove unicode
    .toLowerCase();

const convertCmc = (card, isExtra) => (isExtra ? 0 : card.cmc);

const convertLegalities = (card, isExtra) => {
  if (isExtra) {
    return {
      Legacy: false,
      Modern: false,
      Standard: false,
      Pauper: false,
      Pioneer: false,
    };
  }
  return {
    Legacy: card.legalities.legacy === 'legal',
    Modern: card.legalities.modern === 'legal' || card.legalities.modern === 'banned',
    Standard: card.legalities.standard === 'legal' || card.legalities.standard === 'banned',
    Pioneer: card.legalities.pioneer === 'legal' || card.legalities.pioneer === 'banned',
    Pauper: card.legalities.pauper === 'legal' || card.legalities.pauper === 'banned',
  };
};

const convertParsedCost = (card, isExtra = false) => {
  if (isExtra) {
    return [];
  }

  if (!card.mana_cost) {
    return [''];
  }

  let parsedCost = [];
  if (typeof card.card_faces === 'undefined' || card.layout === 'flip') {
    parsedCost = card.mana_cost
      .substr(1, card.mana_cost.length - 2)
      .toLowerCase()
      .split('}{')
      .reverse();
  } else if (card.layout === 'split' || card.layout === 'adventure') {
    parsedCost = card.mana_cost
      .substr(1, card.mana_cost.length - 2)
      .replace(' // ', '{split}')
      .toLowerCase()
      .split('}{')
      .reverse();
  } else if (card.card_faces[0].colors) {
    parsedCost = card.card_faces[0].mana_cost
      .substr(1, card.card_faces[0].mana_cost.length - 2)
      .toLowerCase()
      .split('}{')
      .reverse();
  } else {
    console.error(`Error converting parsed colors: (isExtra:${isExtra}) card.name`);
  }

  if (parsedCost) {
    parsedCost.forEach((item, index) => {
      parsedCost[index] = item.replace('/', '-');
    });
  }
  return parsedCost;
};

const convertColors = (card, isExtra = false) => {
  if (isExtra) {
    if (typeof card.card_faces === 'undefined' || card.card_faces.length < 2) {
      console.error(`Error converting colors: (isExtra:${isExtra}) card.name`);
      return [];
    }
    // special case: Adventure faces currently do not have colors on Scryfall (but probably should)
    if (card.layout === 'adventure') {
      return Array.from(card.colors);
    }
    // TODO: handle cards with more than 2 faces
    return Array.from(card.card_faces[1].colors);
  }

  if (typeof card.card_faces === 'undefined') {
    return Array.from(card.colors);
  }

  // card has faces
  switch (card.layout) {
    // NOTE: flip, split and Adventure cards include colors in the main details but not in the card faces
    case 'flip':
    case 'split':
    case 'adventure':
      return Array.from(card.colors);
    default:
  }

  // otherwise use the colors from the first face
  if (card.card_faces[0].colors) {
    return Array.from(card.card_faces[0].colors);
  }

  console.error(`Error converting colors: (isExtra:${isExtra}) card.name`);
  return [];
};

const convertType = (card, isExtra) => {
  let type = card.type_line;
  if (isExtra) {
    type = type.substring(type.indexOf('/') + 2);
  } else if (type.includes('//')) {
    type = type.substring(0, type.indexOf('/'));
  }
  if (type === 'Artifact — Contraption') {
    type = 'Artifact Contraption';
  }
  return type.trim();
};

const convertId = (card, isExtra) => (isExtra ? `${card.id}2` : card.id);

const convertName = (card, isExtra) => {
  let str = card.name;

  if (isExtra) {
    str = str.substring(str.indexOf('/') + 2); // second name
  } else if (card.name.includes('/') && card.layout !== 'split') {
    // NOTE: we want split cards to include both names
    // but other double face to use the first name
    str = str.substring(0, str.indexOf('/')); // first name
  }
  return str.trim();
};

const specialCaseCards = {
  "Outlaws' Merriment": [
    'db951f76-b785-453e-91b9-b3b8a5c1cfd4',
    'cd3ca6d5-4b2c-46d4-95f3-f0f2fa47f447',
    'c994ea90-71f4-403f-9418-2b72cc2de14d',
  ],

  "Trostani's Summoner": [
    '703e7ecf-3d73-40c1-8cfe-0758778817cf',
    '5fc993a7-a1ce-4403-a0a0-2afc9f9eca42',
    '214a48bc-4a1c-44e3-9415-a73af3d4fd95',
  ],
  // These two are a bit of a problem. Normaly when an ability creates copies the scryfall tokens associated with it are fetched.
  // This works great in most cases, but these two already have a token in scryfall only it's the wrong token. It's a token refering to
  // the first ability and not the one that generates the copies.
  'Saheeli, the Gifted': ['761507d5-d36a-4123-a074-95d7f6ffb4c5', 'a020dc47-3747-4123-9954-f0e87a858b8c'],
  'Daretti, Ingenious Iconoclast': ['7c82af53-2de8-4cd6-84bf-fb39d2693de2', 'a020dc47-3747-4123-9954-f0e87a858b8c'],

  // There simply does not seem to exist a 3/1 red elemental token with haste but without trample so i choose the closest thing.
  'Chandra, Flamecaller': ['bc6f27f7-0248-4c04-8022-41073966e4d8'],

  // the cards below are transform cards that are on here due to the way
  // we currently do not populate the oracle text of transform cards.
  'Arlinn Kord': ['bd05e304-1a16-436d-a05c-4a38a839759b'],
  'Bloodline Keeper': ['71496671-f7ba-4014-a895-d70a27979db7'],
  'Docent of Perfection': ['e4439a8b-ef98-428d-a274-53c660b23afe'],
  'Dowsing Dagger': ['642d1d93-22d0-43f9-8691-6790876185a0'],
  'Extricator of Sin': ['11d25bde-a303-4b06-a3e1-4ad642deae58'],
  'Garruk Relentless': ['bd05e304-1a16-436d-a05c-4a38a839759b', '7a49607c-427a-474c-ad77-60cd05844b3c'],
  'Golden Guardian': ['a7820eb9-6d7f-4bc4-b421-4e4420642fb7'],
  'Hanweir Militia Captain': ['94ed2eca-1579-411d-af6f-c7359c65de30'],
  'Huntmaster of the Fells': ['bd05e304-1a16-436d-a05c-4a38a839759b'],
  "Jace, Vryn's Prodigy": ['458e37b1-a849-41ae-b63c-3e09ffd814e4'],
  "Legion's Landing": ['09293ae7-0629-417b-9eda-9bd3f6d8e118'],
  'Liliana, Heretical Healer': ['8e214f84-01ee-49c1-8801-4e550b5ade5d'],
  'Mayor of Avabruck': ['bd05e304-1a16-436d-a05c-4a38a839759b'],
  'Nissa, Vastwood Seer': ['0affd414-f774-48d1-af9e-bff74e58e1ca'],
  'Shrill Howler': ['11d25bde-a303-4b06-a3e1-4ad642deae58'],
  'Storm the Vault': ['e6fa7d35-9a7a-40fc-9b97-b479fc157ab0'],
  'Treasure Map': ['e6fa7d35-9a7a-40fc-9b97-b479fc157ab0'],
  'Westvale Abbey': ['94ed2eca-1579-411d-af6f-c7359c65de30'],
};

const getScryfallTokensForCard = (card) => {
  const allParts = card.all_parts || [];
  return allParts
    .filter((element) => element.component === 'token' || element.type_line.startsWith('Emblem'))
    .map(({ id }) => id);
};

const getTokensForSpecialCaseCard = (card) => {
  if (card.card_faces) {
    return specialCaseCards[card.card_faces[0].name] || [];
  }
  return specialCaseCards[card.name] || [];
};

const specialCaseTokens = {
  Food: 'bf36408d-ed85-497f-8e68-d3a922c388a0',
  Treasure: 'e6fa7d35-9a7a-40fc-9b97-b479fc157ab0',
  Poison: '470618f6-f67f-44c6-a086-285632508915',
  "City's Blessing": 'ba64ed3e-93c5-406f-a38d-65cc68472122',
  Monarch: '40b79918-22a7-4fff-82a6-8ebfe6e87185',
  Energy: 'a446b9f8-cb22-408a-93ff-bee44a0dccc0',
};

const arraySetEqual = (target, candidate) => {
  let isValid = candidate.length === target.length;
  if (!isValid) return false;

  for (let idx = 0; idx < target.length; idx++) {
    if (!candidate.includes(target[idx])) {
      isValid = false;
      break;
    }
  }
  return isValid;
};

const getTokens = (card, catalogCard, dict, nameToId) => {
  const mentionedTokens = [];
  const recordedTokens = getScryfallTokensForCard(card);
  const specialTokens = getTokensForSpecialCaseCard(card);
  if (specialTokens.length > 0) {
    mentionedTokens.push(...recordedTokens);
  } else if (recordedTokens.length > 0) {
    catalogCard.tokens = recordedTokens;
  } else if (catalogCard.oracle_text !== null) {
    if (catalogCard.oracle_text.includes(' token')) {
      // find the ability that generates the token to reduce the amount of text to get confused by.
      const abilities = catalogCard.oracle_text.split('\n');
      for (const ability of abilities) {
        if (ability.includes(' token')) {
          const reString =
            '((?:(?:([A-Za-z ,]+), a (legendary))|[Xa-z ]+))(?: ([0-9X]+/[0-9X]+))? ((?:red|colorless|green|white|black|blue| and )+)?(?: ?((?:(?:[A-Z][a-z]+ )+)|[a-z]+))?((?:legendary|artifact|creature|Aura|enchantment| )*)?tokens?( that are copies of)?(?: named ((?:[A-Z][a-z]+ ?|of ?)+(?:\'s \\w+)?)?)?(?:(?: with |\\. It has )?((?:(".*")|[a-z]+| and )+)+)?(?:.*(a copy of))?';
          const re = new RegExp(reString);
          const result = re.exec(ability);
          // eslint-disable-next-line no-continue
          if (typeof result === 'undefined') continue;

          let tokenPowerAndToughness = result[4];
          const tokenColorString = result[5] ? result[5] : result[1];
          const tokenSubTypesString = result[6] ? result[6].trim() : '';
          let tokenSuperTypesString = result[7] ? result[7].trim() : '';
          if (result[3]) tokenSuperTypesString = `legendary ${tokenSuperTypesString}`;
          let tokenName;
          if (result[9]) {
            tokenName = result[9].trim();
          } else {
            tokenName = result[2] ? result[2] : tokenSubTypesString;
          } // if not specificaly named, use the type

          const tokenAbilities = [];
          if (result[10]) {
            const tmpTokenKeywords = result[10]
              .toLowerCase()
              .replace(/ *"[^"]*" */g, '')
              .replace(' and ', ',')
              .split(',');
            tmpTokenKeywords.forEach((part) => {
              if (part.length > 0) tokenAbilities.push(part);
            });
          }

          if (result[11]) {
            const tmpTokenAbilities = result[11].toLowerCase().split('"');
            tmpTokenAbilities.forEach((part) => {
              if (part.length > 0) tokenAbilities.push(part);
            });
          }

          const isACopy = !!(result[12] || result[8]);

          if (Object.keys(specialCaseTokens).includes(tokenName)) {
            mentionedTokens.push(specialCaseTokens[tokenName]);
            continue; // eslint-disable-line no-continue
          }

          if (isACopy) {
            // most likely a token that could be a copy of any creature but it could have a specific token
            if (ability.toLowerCase().includes("create a token that's a copy of a creature token you control."))
              // populate
              continue; // eslint-disable-line no-continue

            const cardTokens = getScryfallTokensForCard(card);

            if (cardTokens.length > 0) {
              mentionedTokens.push(...cardTokens);
            } // if there is no specified tokens for the card use the generic copy token
            else {
              mentionedTokens.push('a020dc47-3747-4123-9954-f0e87a858b8c');
            }
            continue; // eslint-disable-line no-continue
          }

          const tokenColor = [];
          if (tokenColorString) {
            const colorStrings = tokenColorString.trim().split(' ');
            for (const rawColor of colorStrings) {
              switch (rawColor.toLowerCase()) {
                case 'red':
                  tokenColor.push('R');
                  break;
                case 'white':
                  tokenColor.push('W');
                  break;
                case 'green':
                  tokenColor.push('G');
                  break;
                case 'black':
                  tokenColor.push('B');
                  break;
                case 'blue':
                  tokenColor.push('U');
                  break;
                default:
              }
            }
          }
          let tokenPower;
          let tokenToughness;
          if (tokenPowerAndToughness) {
            if (tokenPowerAndToughness.length > 0) {
              tokenPowerAndToughness = tokenPowerAndToughness.replace(/X/g, '*');
              [tokenPower, tokenToughness] = tokenPowerAndToughness.split('/');
            }
          } else if (ability.includes('power and toughness are each equal')) {
            tokenPower = '*';
            tokenToughness = '*';
          }

          const dbHits = nameToId[tokenName.toLowerCase()];
          if (dbHits === undefined) {
            // for all the cards that produce tokens but do not have any in the database
            result.push('');
            continue; // eslint-disable-line no-continue
          }
          for (const dbHit of dbHits) {
            const candidate = dict[dbHit];
            const areColorsValid = arraySetEqual(tokenColor, candidate.colors);

            const candidateTypes = candidate.type
              .toLowerCase()
              .replace(' —', '')
              .replace('token ', '')
              .split(' ');

            const creatureTypes = [];
            tokenSuperTypesString
              .toLowerCase()
              .split(' ')
              .forEach((type) => {
                creatureTypes.push(type);
              });
            tokenSubTypesString
              .toLowerCase()
              .split(' ')
              .forEach((type) => {
                creatureTypes.push(type);
              });
            const areTypesValid = arraySetEqual(creatureTypes, candidateTypes);

            let areAbilitiesValid = false;
            if (candidate.oracle_text !== undefined && candidate.oracle_text.length > 0) {
              areAbilitiesValid = arraySetEqual(
                tokenAbilities,
                candidate.oracle_text
                  .toLowerCase()
                  .replace(/ *\([^)]*\) */g, '')
                  .split(', '),
              );
            } else {
              areAbilitiesValid = arraySetEqual(tokenAbilities, []);
            }

            if (
              candidate.power === tokenPower &&
              candidate.toughness === tokenToughness &&
              areColorsValid &&
              areTypesValid &&
              areAbilitiesValid
            ) {
              mentionedTokens.push(candidate.scryfall_id);
              break;
            }
          }
        }
      }
    }
    if (catalogCard.oracle_text.includes('Ascend (')) {
      mentionedTokens.push(specialCaseTokens["City's Blessing"]);
    }
    if (catalogCard.oracle_text.includes('poison counter')) {
      mentionedTokens.push(specialCaseTokens.Poison);
    }
    if (catalogCard.oracle_text.includes('you become the monarch')) {
      mentionedTokens.push(specialCaseTokens.Monarch);
    }
    if (catalogCard.oracle_text.includes('{E}')) {
      mentionedTokens.push(specialCaseTokens.Energy);
    }

    if (catalogCard.oracle_text.includes('emblem')) {
      const hits = nameToId[`${card.name.toLowerCase()} emblem`];
      if (Array.isArray(hits) && hits.length > 0) {
        mentionedTokens.push(hits[0]);
      }
    }
  }

  return mentionedTokens;
};

const isEquivalent = (a, b) => {
  // Create arrays of property names
  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);

  // If number of properties is different,
  // objects are not equivalent
  if (aProps.length !== bProps.length) {
    return false;
  }

  for (let i = 0; i < aProps.length; i++) {
    const propName = aProps[i];

    // If values of same property are not equal,
    // objects are not equivalent
    if (a[propName] !== b[propName]) {
      return false;
    }
  }

  // If we made it this far, objects
  // are considered equivalent
  return true;
};

const convertCard = (card, isExtra) => {
  let faceAttributeSource;
  const newcard = {};
  if (isExtra) {
    [, faceAttributeSource] = card.card_faces;
  } else if (card.card_faces) {
    [faceAttributeSource] = card.card_faces;
  } else {
    faceAttributeSource = card;
  }
  const name = convertName(card, isExtra);
  newcard.color_identity = Array.from(card.color_identity);
  newcard.set = card.set;
  newcard.collector_number = card.collector_number;
  newcard.promo =
    card.promo ||
    (card.frame_effects && card.frame_effects.includes('extendedart')) ||
    (card.frame_effects && card.frame_effects.includes('showcase')) ||
    card.textless ||
    card.frame === 'art_series' ||
    card.set.toLowerCase() === 'mps' || // kaladesh masterpieces
    card.set.toLowerCase() === 'mp2' || // invocations
    card.set.toLowerCase() === 'exp'; // expeditions
  newcard.digital = card.digital;
  newcard.isToken = card.layout === 'token';
  newcard.border_color = card.border_color;
  newcard.name = name;
  newcard.name_lower = normalizeName(name);
  newcard.full_name = `${name} [${card.set}-${card.collector_number}]`;
  newcard.artist = card.artist;
  newcard.scryfall_uri = card.scryfall_uri;
  newcard.rarity = card.rarity;
  if (typeof card.card_faces === 'undefined') {
    newcard.oracle_text = card.oracle_text;
  } else {
    // concatenate all card face text to allow it to be found in searches
    newcard.oracle_text = card.card_faces.map((face) => face.oracle_text).join('\n');
  }
  newcard.scryfall_id = convertId(card, isExtra);
  newcard.oracle_id = card.oracle_id;
  newcard.cmc = convertCmc(card, isExtra);
  newcard.legalities = convertLegalities(card, isExtra);
  newcard.parsed_cost = convertParsedCost(card, isExtra);
  newcard.colors = convertColors(card, isExtra);
  newcard.type = convertType(card, isExtra);
  newcard.full_art = card.full_art;
  newcard.language = card.lang;
  newcard.mtgo_id = card.mtgo_id;

  if (card.tcgplayer_id) {
    newcard.tcgplayer_id = card.tcgplayer_id;
  }
  if (faceAttributeSource.loyalty) {
    newcard.loyalty = faceAttributeSource.loyalty;
  }
  if (faceAttributeSource.power) {
    newcard.power = faceAttributeSource.power;
  }
  if (faceAttributeSource.toughness) {
    newcard.toughness = faceAttributeSource.toughness;
  }
  if (faceAttributeSource.image_uris) {
    newcard.image_small = faceAttributeSource.image_uris.small;
    newcard.image_normal = faceAttributeSource.image_uris.normal;
    newcard.art_crop = faceAttributeSource.image_uris.art_crop;
  } else {
    newcard.image_small = card.image_uris.small;
    newcard.image_normal = card.image_uris.normal;
    newcard.art_crop = card.image_uris.art_crop;
  }
  if (card.card_faces && card.card_faces.length >= 2 && card.card_faces[1].image_uris) {
    newcard.image_flip = card.card_faces[1].image_uris.normal;
  }
  if (newcard.type.toLowerCase().includes('land')) {
    newcard.colorcategory = 'l';
  } else if (newcard.color_identity.length === 0) {
    newcard.colorcategory = 'c';
  } else if (newcard.color_identity.length > 1) {
    newcard.colorcategory = 'm';
  } else if (newcard.color_identity.length === 1) {
    newcard.colorcategory = newcard.color_identity[0].toLowerCase();
  }

  newcard.scryfall_object = card;

  return newcard;
};

const addToken = (card, dict, nameToId) => {
  const tokens = getTokens(card.scryfall_object, card, dict, nameToId);
  if (tokens.length > 0) {
    card.tokens = tokens;
  }
};

module.exports = {
  convertCard,
  isEquivalent,
  addToken,
};