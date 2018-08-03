'use strict';

const Alexa = require('alexa-sdk');
const story = 'Rival Pokemon Battle.html';
const TableName = null // story.replace('.html','').replace(/\s/g, "-");
var $twine = null;
const linksRegex = /\[\[([^\|\]]*)\|?([^\]]*)\]\]/g;
const gameOver = ' Want to try again? Say new game.'
let activeBattle = false
let battleStart = false // Changed for testing original value is false
let pokemonArray = ['Venusaur', 'Blastoise', 'Charizard'] // An array for users to choose pokemon from. Checks for equality in the currentRoom function
let garyPokemonArray = ['Exeggutor', 'Gyarados', 'Arcanine']
let playerSelectedPokemon; // Insert these values for back end testing. Original value is null
let npcSelectedPokemon; // Insert these values for back end testing. Original value is null
let playerHp; // Insert these values for back end testing. Original value is null
let npcHp; // Insert these values for back end testing. Original value is null
let swordsdanceBuff;
let withdrawBuff;
let focusenergyBuff;
let pokemonStats = {
  Venusaur: {
    stats: {
      type: 'grass',
      hp: 364,
      attack: 289,
      defense: 291,
      spAttack: 328,
      speed: 284
    },
    moves: {
      solarbeam: {
        power: 120,
        type: 'grass'
      },
      megadrain: {
        power: 40,
        type: 'grass'
      },
      focusenergy: {
        power: 'critical',
        type: 'grass'
      },
      vinewhip: {
        power: 35,
        type: 'grass'
      }
    }
  },
  Blastoise: {
    stats: {
      type: 'water',
      hp: 362,
      attack: 291,
      defense: 328,
      spAttack: 339,
      speed: 280
    },
    moves: {
      hydropump: {
        power: 120,
        type: 'water'
      },
      skullbash: {
        power: 100,
        type: 'normal'
      },
      withdraw: {
        power: 'defense',
        type: 'normal'
      },
      surf: {
        power: 95,
        type: 'water'
      }
    }
  },
  Charizard: {
    stats: {
      type: 'fire',
      hp: 360,
      attack: 293,
      defense: 280,
      spAttack: 348,
      speed: 328
    },
    moves: {
      fireblast: {
        power: 120,
        type: 'fire'
      },
      flamethrower: {
        power: 95,
        type: 'fire'
      },
      slash: {
        power: 70,
        type: 'normal'
      },
      swordsdance: {
        power: 'attack',
        type: 'normal'
      }
    }
  },
  'Exeggutor': {
    stats: {
      type: 'grass',
      hp: 394,
      attack: 317,
      defense: 295,
      spAttack: 383,
      speed: 229
    },
    moves: {
      solarbeam: {
        power: 120,
        type: 'grass'
      },
      psychic: {
        power: 90,
        type: 'psychic'
      },
      megadrain: {
        power: 40,
        type: 'grass'
      },
      eggBomb: {
        power: 100,
        type: 'normal'
      }
    }
  },
  'Gyarados': {
    stats: {
      type: 'water',
      hp: 394,
      attack: 383,
      defense: 282,
      spAttack: 240,
      speed: 287
    },
    moves: {
      bite: {
        power: 60,
        type: 'dark'
      },
      hydropump: {
        power: 110,
        type: 'water'
      },
      hyperbeam: {
        power: 150,
        type: 'normal'
      },
      surf: {
        power: 90,
        type: 'water'
      }
    }
  },
  'Arcanine': {
    stats: {
      type: 'fire',
      hp: 384,
      attack: 350,
      defense: 284,
      spAttack: 328,
      speed: 317
    },
    moves: {
      fireblast: {
        power: 120,
        type: 'fire'
      },
      flamethrower: {
        power: 95,
        type: 'fire'
      },
      takedown: {
        power: 90,
        type: 'normal'
      },
      bite: {
        power: 60,
        type: 'dark'
      }
    }
  }
}
let currentPokemon;

module.exports.handler = (event, context, callback) => {
  // console.log(`handler is firing: ${JSON.stringify(event)}`);

  // read the Twine 2 (Harlowe) story into JSON
  var fs = require('fs');
  var contents = fs.readFileSync(story, 'utf8');
  var m = contents.match(/<tw-storydata [\s\S]*<\/tw-storydata>/g);
  // console.log(`this is the contents of m: ${m}`)
  var xml = m[0];
  // because Twine xml has an attribute with no value
  xml = xml.replace('hidden>', 'hidden="true">');
  var parseString = require('xml2js').parseString;
  parseString(xml, function(err, result) {
    $twine = result['tw-storydata']['tw-passagedata'];
  });

  // prepare alexa-sdk
  const alexa = Alexa.handler(event, context);
  // APP_ID is your skill id which can be found in the Amazon developer console
  // where you create the skill. Optionally set as a Lamba environment variable.
  alexa.appId = process.env.APP_ID;
  alexa.dynamoDBTableName = TableName;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

const handlers = {
  'LaunchRequest': function() {
    // console.log(`LaunchRequest is firing`);
    if (this.event.session.attributes['room'] !== undefined) {
      var room = currentRoom(this.event);
      // I've structured the resume prompt so that the title of each room should be a present perfect action verb i.e. 'fighting Gary'
      var speechOutput = `Hello, you last left off ${room['$']['name']}. Would you like to resume? `;
      var reprompt = `Say, resume game, or, new game.`;
      speechOutput = speechOutput + reprompt;
      // var cardTitle = `Restart`;
      // var cardContent = speechOutput;
      // var imageObj = undefined;
      // console.log(`LaunchRequest JSON is: ${JSON.stringify({
      //   "speak": speechOutput,
      //   "listen": reprompt,
      //   "card" : {
      //     "title": cardTitle,
      //     "content": cardContent,
      //     "imageObj": imageObj
      //   }
      // })}`);
      this.response.speak(speechOutput)
        .listen(reprompt)
        // .cardRenderer(cardTitle, cardContent, imageObj);
      this.emit(':responseReady');
    } else {
      this.event.session.attributes['roster'] = [];
      this.event.session.attributes['npc'] = [];
      this.emit('WhereAmI');
    }
  },
  'ResumeGame': function() {
    console.log(`ResumeGame:`);
    this.emit('WhereAmI');
  },
  'RestartGame': function() {
    console.log(`RestartGame:`);
    // clear session attributes and global variables
    this.event.session.attributes['room'] = undefined;
    this.event.session.attributes['visited'] = [];
    this.event.session.attributes['roster'] = []
    this.event.session.attributes['npc'] = [];
    playerSelectedPokemon;
    npcSelectedPokemon;
    playerHp;
    npcHp;
    this.emit('WhereAmI');
  },
  'WhereAmI': function() {
    var speechOutput = "";
    if (this.event.session.attributes['room'] === undefined) {
      // you just started so you are in the first room
      // console.log(`Here is the $twine value before changing: ${JSON.stringify($twine[0])}`)
      this.event.session.attributes['room'] = $twine[0]['$']['pid'];
      speechOutput = `Welcome to ${story.replace('.html','')}. Lets start your game. `;
    }

    var room = currentRoom(this.event);

    // Check to see that you have a pokemon selected and that you're not adding a repeat to the roster.
    if (currentPokemon !== undefined && this.event.session.attributes['roster'].includes(currentPokemon) === false) {
      this.event.session.attributes['roster'].push(currentPokemon);
      }
    // console.log(`WhereAmI: in ${JSON.stringify(room)}`);
    // console.log(`linksRegex.exec on room is: ${linksRegex.exec(room['_'])}`)

    // get displayable text
    // e.g "You are here. [[Go South|The Hall]]" -> "You are here. Go South"
    var displayableText = room['_'];
    linksRegex.lastIndex = 0;
    let m;
    while ((m = linksRegex.exec(displayableText)) !== null) {
      displayableText = displayableText.replace(m[0], m[1]);
      linksRegex.lastIndex = 0;
    }
    // strip html
    // console.log(`this is the displayableText after the while loop: ${displayableText}`)
    displayableText = displayableText.replace(/<\/?[^>]+(>|$)/g, "");
    displayableText = displayableText.replace("&amp;", "and");
    speechOutput = speechOutput + displayableText;

    // create reprompt from links: "You can go north or go south"
    var reprompt = "";
    linksRegex.lastIndex = 0;
    while ((m = linksRegex.exec(room['_'])) !== null) {
      if (m.index === linksRegex.lastIndex) {
        linksRegex.lastIndex++;
      }
      if (reprompt === "") {
        if (!m[1].toLowerCase().startsWith('if you')) {
          reprompt = "You can";
        }
      } else {
        reprompt = `${reprompt} or`;
      }
      reprompt = `${reprompt} ${m[1]}`;
    }

    var firstSentence = displayableText.split('.')[0];
    var lastSentence = displayableText.replace('\n',' ').split('. ').pop();
    var reducedContent = `${firstSentence}. ${reprompt}.`;

    // say less if you've been here before
    // if (this.event.session.attributes['visited'] === undefined) {
    //   this.event.session.attributes['visited'] = [];
    //   this.event.session.attributes['roster'] = [];
    //   this.event.session.attributes['npc'] = [];
    // }
    // if (this.event.session.attributes['visited'].includes(room['$']['pid'])) {
    //   console.log(`WhereAmI: player is revisiting`);
    //   speechOutput = reducedContent;
    // } else {
    //   this.event.session.attributes['visited'].push(room['$']['pid']);
    // }

    linksRegex.lastIndex = 0;

    // Seperate the tags into an array so we can pick different game actions for each room. Some rooms have multiple tags
    let roomTags = room['$']['tags'].split(' ')
    // Below, if we're on a room with a GameOver tag, then Alexa tells us the gameOver prompt. If we're in a battle room, she initiates the npc variables and battle dialog
    if (roomTags[0] === 'GameOver'){
      console.log(`WhereAmI: at the end of a branch. Game over.`);
      // clear session attributes
      this.event.session.attributes['room'] = undefined;
      this.event.session.attributes['visited'] = [];
      this.response.speak(speechOutput + gameOver)
      // .cardRenderer(cardTitle, cardContent, imageObj);
    } else if (roomTags[0] === 'BattleRoom'){
      console.log(`You're in a battle room, you'll have to fight your way out`)
      let npcName = roomTags[1]
      // Checks npc session data for duplicates
      if (this.event.session.attributes['npc'].includes(npcName) === false) {
        this.event.session.attributes['npc'].push(npcName)
      }
      // let npcIndex = this.event.session.attributes['npc'].length - 1
      let npcPokemonIndex = Math.floor((Math.random() * 3));
      // Use the npcIndex to have the active npc pick their pokemon. I want to keep the npcIndex [] rather than using a '' because I want to add more npc's and tell the user who they've beaten in a later version.
      if (npcName === 'Gary') {
        // The variables below persist in the Alexa session but they do not in testing since we're creating a session in a vaccuum. Be aware when testing
        npcSelectedPokemon = garyPokemonArray[npcPokemonIndex]
        npcHp = pokemonStats[npcSelectedPokemon].stats.hp
        playerSelectedPokemon = this.event.session.attributes['roster'][0]
        playerHp = pokemonStats[playerSelectedPokemon].stats.hp
        battleStart = true
        this.response.speak(speechOutput)
          .listen(reprompt)
      }
      // this.response.speak(speechOutput)
      //   .listen(reprompt)
      this.emit('Fight')
    } else {
      console.log(`the room tag is: ${roomTags}`)
      this.response.speak(speechOutput)
        .listen(reprompt)
        // .cardRenderer(cardTitle, cardContent, imageObj);
    }
    this.emit(':responseReady');
  },
  'Go': function() {
    console.log(`Go`);
    var slotValues = getSlotValues(this.event.request.intent.slots);
    followLink(this.event, [slotValues['direction']['resolved'], slotValues['direction']['synonym']]);
    this.emit('WhereAmI');
  },
  'Page': function() {
    // Keeping this in for development to have ability to skip to any page during testing.
    console.log(`Page`);
    followLink(this.event, this.event.request.intent.slots.number.value);
    this.emit('WhereAmI');
  },
  'Fight': function() {
    console.log(`Fight`);
    activeBattle = true
    var speechOutput = ""
    if (battleStart === true) {
      // battleStart === false
      speechOutput = `Gary smiles smugly as you enter the room. 'My pokemon is way out of your league' he says. '${npcSelectedPokemon} I choose you!' The battle is on! Tell your pokemon what move to use.`
      this.response.speak(speechOutput)
        .listen('choose an attack')
      this.emit(':responseReady')
    } else if (playerHp < 0) {
      console.log('you lost the battle');
      this.emit('You have been defeated');
    } else if (npcHp < 0) {
      console.log('you won the battle');
      this.emit('You are victorious')
    } else {
      this.emit(':responseReady')
    }
  },
  'ChooseMove': function() {
    console.log('ChooseMove');
    var speechOutput;
    var playerDamageMessage;
    var npcDamageMessage;
    let playerPokemonStats = pokemonStats[playerSelectedPokemon].stats;
    let npcPokemonStats = pokemonStats[npcSelectedPokemon].stats;
    var attacker = 'npc';
    // Pick which player attacks first
    if (playerPokemonStats.speed > npcPokemonStats.speed) {
      attacker = 'player'
    }
    // Some attacks are two words so we need to join them together
    var attackChoice = this.event.request.intent.slots.attack.value.split(' ');
    attackChoice = attackChoice.join('');

    // NPC picks an attack
    let npcMovesArray = Object.keys(pokemonStats[npcSelectedPokemon].moves)
    let npcChosenMoveName = npcMovesArray[Math.floor(Math.random() * 4)]
    let npcChosenMoveObject = pokemonStats[npcSelectedPokemon].moves[npcChosenMoveName]


    // Below is the battle simulator for when the player picks a legitimate attack.
    let chosenMove = pokemonStats[playerSelectedPokemon].moves[attackChoice];
    console.log(`here is the chosenMove ${chosenMove}`)
    if (chosenMove) {
      // Load up damage messages and adjust health pools after attacks have fired. 
      playerDamageMessage = damageCalculator(chosenMove, attackChoice, playerSelectedPokemon, npcSelectedPokemon)
      npcDamageMessage = damageCalculator(npcChosenMoveObject, npcChosenMoveName, npcSelectedPokemon, playerSelectedPokemon)
      console.log(`this is the npcDamageMessage: ${npcDamageMessage}`)
      console.log(`This is the playerDamageMessage: ${playerDamageMessage}`)
      // Fire messages in order and check for K.O's
      if (attacker === 'npc') {
        if (playerHp <= 0) {
          speechOutput = npcDamageMessage + ` Gary has beaten you.`
        } else if (npcHp <= 0){
          speechOutput = npcDamageMessage + playerDamageMessage + ' You are victorious!'
        } else {
          speechOutput = npcDamageMessage + playerDamageMessage
        }
      } else if (npcHp <= 0) {
        speechOutput = playerDamageMessage + ` You are victorious!`
      } else if (playerHp <= 0) {
        speechOutput = playerDamageMessage + npcDamageMessage + ` Gary has beaten you.`
      } else {
        speechOutput = playerDamageMessage + npcDamageMessage
      }
      // this.response.speak('The chosen move is a legal attack')
      this.emit(':ask', speechOutput, speechOutput);
    } else {
      // console.log(`${playerSelectedPokemon} doesn't know that move`)
      speechOutput = `${playerSelectedPokemon} doesn't know that move`;
      // this.response.speak(`${playerSelectedPokemon} doesn't know that move`)
      this.emit(':ask', speechOutput, speechOutput);
    }
  },
  'AMAZON.HelpIntent': function() {
    var speechOutput = 'This is the Sample Gamebook Skill. ';
    var reprompt = 'Say where am I, to hear me speak.';
    speechOutput = speechOutput + reprompt;
    // var cardTitle = 'Help.';
    // var cardContent = speechOutput;
    // var imageObj = undefined;
    console.log(`HelpIntent: ${JSON.stringify({
      "speak": speechOutput,
      "listen": reprompt,
      // "card" : {
      //   "title": cardTitle,
      //   "content": cardContent,
      //   "imageObj": imageObj
      // }
    })}`);
    this.response.speak(speechOutput)
      .listen(reprompt)
      // .cardRenderer(cardTitle, cardContent, imageObj);
    this.emit(':responseReady');
  },
  'AMAZON.CancelIntent': function() {
    this.emit('CompletelyExit');
  },
  'AMAZON.StopIntent': function() {
    this.emit('CompletelyExit');
  },
  'CompletelyExit': function() {
    var speechOutput = 'Goodbye.';
    if (TableName) {
      speechOutput = `Your progress has been saved. ${speechOutput}`;
    }
    // var cardTitle = 'Exit.';
    // var cardContent = speechOutput;
    // var imageObj = undefined;
    console.log(`CompletelyExit: ${JSON.stringify({
      "speak": speechOutput,
      "listen": null,
      // "card" : {
      //   "title": cardTitle,
      //   "content": cardContent,
      //   "imageObj": imageObj
      // }
    })}`);
    this.response.speak(speechOutput)
      // .cardRenderer(cardTitle, cardContent, imageObj);
    this.emit(':responseReady');
  },
  'AMAZON.RepeatIntent': function() {
    console.log(`RepeatIntent`);
    this.emit('WhereAmI');
  },
  'Unhandled': function() {
    // handle any intent in interaction model with no handler code
    console.log(`Unhandled`);
    followLink(this.event, this.event.request.intent.name);
    this.emit('WhereAmI');
  },
  'SessionEndedRequest': function() {
    // "exit", timeout or error. Cannot send back a response
    console.log(`Session ended: ${this.event.request.reason}`);
  },
};

// Function below tracks which room user is in and checks to see if a pokemon should be added to the user's roster.
function currentRoom(event) {
  var currentRoomData = undefined;
  for (var i = 0; i < $twine.length; i++) {
    if ($twine[i]['$']['pid'] === event.session.attributes['room']) {
      currentRoomData = $twine[i];
      // console.log('about to fire the choose pokemon conditional')
      if (pokemonArray.indexOf($twine[i]['$']['tags']) > -1) {
        currentPokemon = $twine[i]['$']['tags']
        // console.log(`adding ${currentPokemon} to roster`)
        // this.event.session.attributes['roster'].push(currentPokemon)
      } /* else if ($twine[i]['$']['tags'] === 'BattleRoom') {
        pokemonBattle()
      } */
      break;
    }
  }
  return currentRoomData;
}

function followLink(event, direction_or_array) {
  var directions = [];
  if (direction_or_array instanceof Array) {
    directions = direction_or_array;
  } else {
    directions = [direction_or_array];
  }
  var room = currentRoom(event);
  var result = undefined;
  directions.every(function(direction, index, _arr) {
    // console.log(`followLink: try '${direction}' from ${room['$']['name']}`);
    var directionRegex = new RegExp(`.*${direction}.*`, 'i');
    let links;
    linksRegex.lastIndex = 0;
    while ((links = linksRegex.exec(room['_'])) !== null) {
      if (links.index === linksRegex.lastIndex) {
        linksRegex.lastIndex++;
      }
      result = links[1].match(directionRegex);
      var target = links[2] || links[1];
      // console.log(`followLink: check ${links[1]} (${target}) for ${direction} => ${result} `);
      if (result) {
        // console.log(`followLink: That would be ${target}`);
        for (var i = 0; i < $twine.length; i++) {
          if ($twine[i]['$']['name'].toLowerCase() === target.toLowerCase()) {
            event.session.attributes['room'] = $twine[i]['$']['pid'];
            break;
          }
        }
        break;
      }
    }
    return !result;
  });
}

function damageCalculator (chosenMove, moveName, attackingPokemon, defendingPokemon) {
  let playerDamageMessage;
  let healingMessage = '';
  let attackingPokemonStats = pokemonStats[attackingPokemon].stats;
  let defendingPokemonStats = pokemonStats[defendingPokemon].stats;
  let defendingPokemonHp;
  let attackingPokemonHp;
  // Determine who to subtract hp from
  if (garyPokemonArray.indexOf(defendingPokemon) > -1) {
    defendingPokemonHp = npcHp
    attackingPokemonHp = playerHp
  } else {
    defendingPokemonHp = playerHp
    attackingPokemonHp = npcHp
  }
   
  // let chosenMove = pokemonStats[playerSelectedPokemon].moves[attackChoice];

  // Decide between the Attack or spAttack stat
  let specialAtk = ['water', 'grass', 'fire', 'ice', 'electric', 'psychic', 'dragon', 'dark'];
  let attackMultiplier = attackingPokemonStats.spAttack;
  if (specialAtk.indexOf(chosenMove.type) < 0) {
    attackMultiplier = attackingPokemonStats.attack;
    console.log('now the normal attack modifier is being used instead');
  }
  // Decide if the move gets STAB
  let STABMultiplier = 1;
  if (chosenMove.type === attackingPokemonStats.type){
    STABMultiplier = 1.5;
  }

  // Decide if critical hit
  let critHitMessage = '';
  let critMultiplier = 1;
  let critDecider = Math.floor(Math.random() * 256);
  let critThreshold = (attackingPokemonStats.speed / 4);
  if (focusenergyBuff) {
    critThreshold = (critThreshold * 4)
  }
  if (moveName === 'slash') {
    critThreshold = (critThreshold * 8)
  }
  if (critThreshold > critDecider) {
    critMultiplier = 1.75
    critHitMessage = " Critical hit!"
  }

  // Decide if super effective
  let effectiveMultiplier = 1;
  let effectivenessMessage = '';
  if (chosenMove.type === 'grass' || defendingPokemonStats.type === 'dragon') {
    if (defendingPokemonStats.type === 'water') {
      effectiveMultiplier = 2;
    } else if (defendingPokemonStats.type === 'fire'){
      effectiveMultiplier = 0.5;
    }
  } else if (chosenMove.type === 'water') {
    console.log('firing Blastois effectiveness multiplier')
    console.log(`chosenMove.type: ${chosenMove.type}`)
    console.log(`defendingPokemonStats.type: ${defendingPokemonStats.type}`)
    if (defendingPokemonStats.type === 'fire') {
      effectiveMultiplier = 2;
      console.log('firing Blastois effectiveness multiplier is 2')
    } else if (defendingPokemonStats.type === 'grass' || defendingPokemonStats.type === 'dragon'){
      effectiveMultiplier = 0.5;
      console.log('firing Blastois effectiveness multiplier is 0.5')
    }
  } else if (chosenMove.type === 'fire') {
    if (defendingPokemonStats.type === 'grass') {
      effectiveMultiplier = 2;
    } else if (defendingPokemonStats.type === 'water' || defendingPokemonStats.type === 'dragon'){
      effectiveMultiplier = 0.5;
    }
  } 

  if (effectiveMultiplier > 1) {
    effectivenessMessage = " It's super effective!";
  } else if (effectiveMultiplier < 1) {
    effectivenessMessage = " It's not very effective";
  }

  // After all multipliers applied, determine the damage, subtract from defendingPokemonHp, if it's a healing move, heal the attacking pokemon, provide battleReportMessage based on remaining health
  let damageDealt = Math.floor((((20 * chosenMove.power * (attackMultiplier / defendingPokemonStats.defense)) / 50 + 2) * STABMultiplier * critMultiplier * effectiveMultiplier));
  defendingPokemonHp = defendingPokemonHp - damageDealt
  let healedAmount;
  if (moveName === 'megadrain') {
    healedAmount = Math.ceil(damageDealt * 0.75)
    attackingPokemonHp = attackingPokemonHp + healedAmount
    healingMessage = ` healing ${healedAmount} damage.`
  }
  let attackMessage = ` ${attackingPokemon} used ${moveName}.`;
  let damageMessage = ` It did ${damageDealt} damage to ${defendingPokemon} `;
  let battleReportMessage;
  if (defendingPokemonHp <= 0) {
    battleReportMessage = ` ${defendingPokemon} has fainted.`
  } else if (defendingPokemonHp <= 40) {
    battleReportMessage = ` ${defendingPokemon} could fall at any second.`
  } else if (defendingPokemonHp <= 80) {
    battleReportMessage = ` ${defendingPokemon} looks very weak.`
  } else if (defendingPokemonHp <= 120) {
    battleReportMessage = ` ${defendingPokemon} looks exhausted.`
  } else if (defendingPokemonHp <= 180) {
    battleReportMessage = ` ${defendingPokemon} is slowing down.`
  } else if (defendingPokemonHp <= 240) {
    battleReportMessage = ` ${defendingPokemon} is starting to tire.`
  } else if (defendingPokemonHp <= 300) {
    battleReportMessage = ` but ${defendingPokemon} is still looking strong.`
  } else if (defendingPokemonHp <= 340) {
    battleReportMessage = ` ${defendingPokemon} gets serious.`
  } else {
    battleReportMessage = ` but ${defendingPokemon} doesn't look phased.`
  }

  // Set the global hp variables to match the updated values after battle
  if (garyPokemonArray.indexOf(defendingPokemon) > -1) {
    npcHp = defendingPokemonHp
    playerHp = attackingPokemonHp
  } else {
    playerHp = defendingPokemonHp
    npcHp = attackingPokemonHp
  }

  playerDamageMessage = attackMessage + critHitMessage + effectivenessMessage + damageMessage + healingMessage + battleReportMessage
  return playerDamageMessage
}
//COOKBOOK HELPER FUNCTIONS

function getSlotValues(filledSlots) {
  //given event.request.intent.slots, a slots values object so you have
  //what synonym the person said - .synonym
  //what that resolved to - .resolved
  //and if it's a word that is in your slot values - .isValidated
  let slotValues = {};

  // console.log('The filled slots: ' + JSON.stringify(filledSlots));
  Object.keys(filledSlots).forEach(function(item) {
    //console.log("item in filledSlots: "+JSON.stringify(filledSlots[item]));
    var name = filledSlots[item].name;
    //console.log("name: "+name);
    if (filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {

      switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
        case "ER_SUCCESS_MATCH":
          slotValues[name] = {
            "synonym": filledSlots[item].value,
            "resolved": filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
            "isValidated": true
          };
          break;
        case "ER_SUCCESS_NO_MATCH":
          slotValues[name] = {
            "synonym": filledSlots[item].value,
            "resolved": filledSlots[item].value,
            "isValidated": false
          };
          break;
      }
    } else {
      slotValues[name] = {
        "synonym": filledSlots[item].value,
        "resolved": filledSlots[item].value,
        "isValidated": false
      };
    }
  }, this);
  //console.log("slot values: " + JSON.stringify(slotValues));
  return slotValues;
}
