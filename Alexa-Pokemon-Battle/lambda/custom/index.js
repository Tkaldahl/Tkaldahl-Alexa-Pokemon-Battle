'use strict';

const Alexa = require('alexa-sdk');
const story = 'Rival Pokemon Battle.html';
const TableName = null // story.replace('.html','').replace(/\s/g, "-");
var $twine = null;
const linksRegex = /\[\[([^\|\]]*)\|?([^\]]*)\]\]/g;
const gameOver = ' Want to try again? Say new game.'
let activeBattle = false
let battleStart = true // Changed for testing original value is false
let pokemonArray = ['Venusaur', 'Blastoise', 'Charizard'] // An array for users to choose pokemon from. Checks for equality in the currentRoom function
let garyPokemonArray = ['Exeggutor', 'Gyarados', 'Arcanine']
let playerSelectedPokemon = 'Blastoise'; // Changed for testing. Original value is null
let npcSelectedPokemon = 'Exeggutor'; // Changed for testing. Original value is null
let playerHp = 362; // Changed for testing. Original value is null
let npcHp = 394; // Changed for testing. Original value is null
let swordsdanceBuff;
let focusenergyBuff;
let pokemonStats = {
  Venusaur: {
    stats: {
      type: 'Grass',
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
      type: 'Water',
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
      type: 'Fire',
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
      type: 'Grass',
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
      type: 'Water',
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
      type: 'Fire',
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
    // clear session attributes
    this.event.session.attributes['room'] = undefined;
    this.event.session.attributes['visited'] = [];
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
    if (currentPokemon !== undefined) {
      this.event.session.attributes['roster'].push(currentPokemon);
      currentPokemon = undefined;
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
    // all of this information is for visual Alexa tools. Call it using .cardRenderer(cardTitle, cardContent, imageObj); after a speak command.
    // var cardTitle = firstSentence;
    // var cardContent = (reprompt > '') ? reprompt : lastSentence;
    // var imageObj = undefined;

    // console.log(`WhereAmI: ${JSON.stringify({
    //   "speak": speechOutput,
    //   "listen": reprompt,
    //   "card" : {
    //     "title": cardTitle,
    //     "content": cardContent,
    //     "imageObj": imageObj
    //   }
    // })}`);
    linksRegex.lastIndex = 0;
    // Commenting out function which presents game over if a room has no links leading out. I prefer to use the GameOver tag
    // if (linksRegex.exec(room['_'])) {
    //   // room has links leading out, so listen for further user input
    //   this.response.speak(speechOutput)
    //     .listen(reprompt)
    //     .cardRenderer(cardTitle, cardContent, imageObj);
    // } else {
    //   console.log(`WhereAmI: at the end of a branch. Game over.`);
    //   // clear session attributes
    //   this.event.session.attributes['room'] = undefined;
    //   this.event.session.attributes['visited'] = [];
    //   this.response.speak(speechOutput + gameOver)
    //     .cardRenderer(cardTitle, cardContent, imageObj);
    // }

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
      this.event.session.attributes['npc'].push(roomTags[1])
      let npcIndex = this.event.session.attributes['npc'].length - 1
      let npcPokemonIndex = Math.floor((Math.random() * 3));
      // Use the npcIndex to have the active npc pick their pokemon. I want to keep the npcIndex [] rather than using a '' because I want to add more npc's and tell the user who they've beaten in a later version.
      if (this.event.session.attributes['npc'][npcIndex] === 'Gary') {
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
      speechOutput = `Gary smiles smugly as you enter the room. 'My pokemon is way out of your league' he says. '${npcSelectedPokemon} I choose you!'`
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
    var speechOutput;
    console.log('ChooseMove');
    // Some attacks are two words so we need to join them together
    var attackChoice = this.event.request.intent.slots.attack.value.split(' ');
    attackChoice = attackChoice.join('');
    // console.log(`player chooses the attack: ${attackChoice}`)
    let userPokemonStats = pokemonStats[playerSelectedPokemon].stats;
    let npcPokemonStats = pokemonStats[npcSelectedPokemon].stats;
    let chosenMove = pokemonStats[playerSelectedPokemon].moves[attackChoice];
    // Below is the battle simulator for when the player picks a legitimate attack.
    if (chosenMove) {
      // Decide between the Attack or spAttack stat
      let specialAtk = ['water', 'grass', 'fire', 'ice', 'electric', 'psychic', 'dragon', 'dark'];
      let attackMultiplier = userPokemonStats.spAttack;
      if (specialAtk.indexOf(chosenMove.type) < 0) {
        attackMultiplier = userPokemonStats.attack;
        console.log('now the normal attack modifier is being used instead');
      }
      // Decide if the move gets STAB
      let STABMultiplier = 1;
      if (chosenMove.type === userPokemonStats.type){
        STABMultiplier = 1.5;
      }

      // Decide if critical hit
      let critHitMessage = '';
      let critMultiplier = 1;
      let critDecider = Math.floor(Math.random() * 256);
      let critThreshold = (userPokemonStats.speed / 2);
      if (focusenergyBuff) {
        critThreshold = (critThreshold * 4)
      }
      if (attackChoice === 'slash') {
        critThreshold = (critThreshold * 8)
      }
      if (critThreshold > critDecider) {
        critMultiplier = 1.75
        critHitMessage = " It's a critical hit!"
      }

      // Decide if super effective
      let effectiveMultiplier = 1;
      let effectivenessMessage = '';
      if (chosenMove.type === 'grass' || npcPokemonStats.type === 'dragon') {
        if (npcPokemonStats.type === 'water') {
          effectiveMultiplier = 2;
        } else if (npcPokemonStats.type === 'fire'){
          effectiveMultiplier = 0.5;
        }
      } else if (chosenMove.type === 'water') {
        if (npcPokemonStats.type === 'fire') {
          effectiveMultiplier = 2;
        } else if (npcPokemonStats.type === 'grass' || npcPokemonStats.type === 'dragon'){
          effectiveMultiplier = 0.5;
        }
      } else if (chosenMove.type === 'fire') {
        if (npcPokemonStats.type === 'grass') {
          effectiveMultiplier = 2;
        } else if (npcPokemonStats.type === 'water' || npcPokemonStats.type === 'dragon'){
          effectiveMultiplier = 0.5;
        }
      } 

      if (effectiveMultiplier > 1) {
        effectivenessMessage = " It's super effective!";
      } else if (effectiveMultiplier < 1) {
        effectivenessMessage = " It's not very effective";
      }
      let damage = Math.floor((((20 * chosenMove.power * (attackMultiplier / npcPokemonStats.defense)) / 50 + 2) * STABMultiplier * critMultiplier * effectiveMultiplier));
      
      let attackMessage = ` ${playerSelectedPokemon} used ${this.event.request.intent.slots.attack.value}.`;
      let damageMessage = ` It did ${damage} damage to ${npcSelectedPokemon}.`;

      // Update the user on how each pokemon is doing 
      // Looking strong
      // Doesn't look phased
      // Starting to look tired
      // Getting worn down
      // Is tired
      // Can barely stand
      // Could fall at any second
      console.log(`This is the attackMessage: ${attackMessage}`)
      console.log(`This is the critHitMessage: ${critHitMessage}`)
      console.log(`This is the effectivenessMessage: ${effectivenessMessage}`)
      console.log(`This is the damageMessage: ${damageMessage}`)
      // if (critHitMessage && effectivenessMessage) {
      //   speechOutput = `${attackMessage} ${critHitMessage} ${effectivenessMessage} ${damageMessage}.`
      // } else if (critHitMessage) {
      //   speechOutput = `${attackMessage} ${critHitMessage} ${damageMessage}`
      // } else if (effectivenessMessage) {
      //   speechOutput = `${attackMessage} ${effectivenessMessage} ${damageMessage}`
      // } else {
      //   speechOutput = `${attackMessage} ${damageMessage}`
      // }

      speechOutput = attackMessage + critHitMessage + effectivenessMessage + damageMessage
      console.log(`This is the speechOutput: ${speechOutput}`)
      // this.response.speak('The chosen move is a legal attack')
      this.emit(':ask', speechOutput, speechOutput);
    } else {
      // console.log(`${playerSelectedPokemon} doesn't know that move`)
      speechOutput = `${playerSelectedPokemon} doesn't know that move`;
      // this.response.speak(`${playerSelectedPokemon} doesn't know that move`)
      this.emit(':ask', speechOutput, speechOutput);
    }
    // console.log(`${attackChoice} has `)
    // The name of the attack we choose is stored in this.event.request.intent.slots.attack.value
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

// function pokemonBattle () {
//   let battleSpeechOutput = ''
//   // I need a fight handler and a battle updater

// }

// function useMove(event, move) {
//   let chosenMove;
//   // Alexa wants to work with an array. If she hears multiple moves she'll give us an array. Just one and we have to put into our own array
//   if (move instanceof Array) {
//     chosenMove = move;
//   } else {
//     chosenMove = [move];
//   }
//   console.log(chosenMove)
// }

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
