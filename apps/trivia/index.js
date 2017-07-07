var alexa = require('alexa-app');
var rp = require('request-promise');
var db = require('promise-mysql');
var config = require('./config');

config.db_credentials.database = "trivia";

module.change_code = 1;

var id = "amzn1.ask.account.AE3DFDHRHAUZTVGYWSTUE5734WHJNEI4MJMANJ5WVZ57DMIMMMOAYV6BHWIH76WGB56CKRRXYZWA4BPLPHH6E7EHQGU4FL4UXD4B5MOIA6FXKP7I7TR462RZWRHKLR2NO4ZAXQYNGGANGATF3FR4EFMU6FKII274NDY37NSGET5YWVAZ236HNHR4NFRD2F3XV23C33C4ST5B7DA";

sessionUpdate(id);
restoreSession(id, {});

// VARS
// CATEGORIES
var triviaAPI = 'https://opentdb.com/api.php?amount=10&category={CATEGORY}&difficulty={DIFFICULTY}&type=multiple';
var triviaCategories = {
  "any": 0,
  "general knowledge": 9,
  "books": 10,
  "film": 11,
  "music": 12,
  "musicals and theatres": 13,
  "television": 14,
  "video games": 15,
  "board games": 16,
  "science and nature": 17,
  "computers": 18,
  "mathematics": 19,
  "mythology": 20,
  "sports": 21,
  "geography": 22,
  "history": 23,
  "politics": 24,
  "art": 25,
  "celebrities": 26,
  "animals": 27,
  "vehicles": 28,
  "comics": 29,
  "gadgets": 30,
  "anime and manga": 31,
  "cartoon and animations": 32
};

var triviaDifficulties = ["easy", "medium", "hard"];

var answerMarks = ['A', 'B', 'C', 'D'];

var repromptTexts = [
  "Sorry?",
  "I can't hear you.",
  "Is anybody out there?",
  "I'm listening",
  "Come on, don't be shy.",
  "Oh, come on, it's not so hard!"
];
var correctAnswerTexts = [
  "Yay, it's correct!",
  "Your answer is... Correct!",
  "That's right!",
  "Congratulations, you answered correctly."
];
var incorrectAnswerTexts = [
  "Sorry, but it's wrong.",
  "Your answer is... Wrong!",
  "No no, that's wrong.",
  "404, the correct answer was not found!"
];
var waitTexts = [
  "Ok, I will wait a little bit.",
  "You got some extra time!"
];
var repeatTexts = [
  "Ok, I will repeat one more time.",
  "Let's read it one more time."
];
var finalScoreTexts = [
  [
    "Maybe this game is too hard for you."
  ],
  [
    "You are new here, right?"
  ],
  [
    "No problem, let's try it again!"
  ],
  [
    "Super! This is my lucky number! Unfortunately, it's a low score in this game."
  ],
  [
    "It's ok, it will be better in the next time."
  ],
  [
    "Half way to the stars!"
  ],
  [
    "Really good, just keep it up!"
  ],
  [
    "Not bad. Let's do it again!"
  ],
  [
    "Good job!"
  ],
  [
    "Almost perfect!"
  ],
  [
    "Excellent!"
  ],
];
// ============================================================

var playerData = {
  "category": 0,
  "categoryName": 'any',
  "difficulty": "medium",
  "started": false
};

// Define an alexa-app
var app = new alexa.app('trivia');
app.id = require('./package.json').alexa.applicationId;


app.launch(function(request, response) {
  var session = request.getSession();
  session.set("playerData", JSON.stringify(playerData));

  response
    .say("Welcome to Trivia! Say start to begin.")
    .reprompt(getRandomMessage(repromptTexts))
    .shouldEndSession(false);
});

app.intent("SetCategoryIntent", {
  "slots": {"category": "CATEGORIES"},
  "utterances": [
    "Set category to {category}"
  ],
}, function(request, response) {
  var session = request.getSession();
  var playerData = session.get('playerData');
  playerData = JSON.parse(playerData);

  if (playerData.started) {
    response
      .say("You can not change the category during a game.")
      .reprompt(getRandomMessage(repromptTexts))
      .shouldEndSession(false);
  }
  else {
    var catName = request.slot("category");

    if (typeof triviaCategories[catName] != "undefined") {
      playerData.category = triviaCategories[catName];
      playerData.categoryName = catName;
      session.set("playerData", JSON.stringify(playerData));

      response
        .say("Category setted to " + catName)
        .reprompt(getRandomMessage(repromptTexts))
        .shouldEndSession(false);
    }
    else {
      response
        .say("Sorry, but there is no " + catName + " category registered in the game, please, try again with another category.")
        .reprompt(getRandomMessage(repromptTexts))
        .shouldEndSession(false);
    }
  }
});

app.intent("SetDifficultyIntent", {
  "slots": {"difficulty": "DIFFICULTY"},
  "utterances": [
    "Set difficulty to {difficulty}"
  ],
}, function(request, response) {
  var session = request.getSession();
  var playerData = session.get('playerData');
  playerData = JSON.parse(playerData);

  if (playerData.started) {
    response
      .say("You can not change the difficulty during a game.")
      .reprompt(getRandomMessage(repromptTexts))
      .shouldEndSession(false);
  }
  else {
    var difficulty = request.slot("difficulty");

    if (triviaDifficulties.indexOf(difficulty) >= 0) {
      playerData.difficulty = difficulty;
      session.set("playerData", JSON.stringify(playerData));

      response
        .say("Difficulty setted to " + difficulty)
        .reprompt(getRandomMessage(repromptTexts))
        .shouldEndSession(false);
    }
    else {
      response
        .say("Sorry, but " + difficulty + " is not a valid difficulty.")
        .reprompt(getRandomMessage(repromptTexts))
        .shouldEndSession(false);
    }
  }
});

app.intent("StartGameIntent", {
  "slots": {},
  "utterances": [
    "Start"
  ],
}, function(request, response) {
  var session = request.getSession();
  var playerData = session.get('playerData');
  playerData = JSON.parse(playerData);

  console.log(request.userId);

  if (playerData.started) {
    response
      .say("The game is already started, please, finish this one first.")
      .reprompt(getRandomMessage(repromptTexts))
      .shouldEndSession(false);
  }
  else {
    // Send request
    return getTriviaData(playerData).then(function(result) {
      switch (result.response_code) {
        case 0:
          response
            .say("Let's do this!")
            .reprompt(getRandomMessage(repromptTexts))
            .shouldEndSession(false);

          var answers;
          for (q in result.results) {
            answers = result.results[q].incorrect_answers;
            answers.push(result.results[q].correct_answer);
            shuffle(answers);
            result.results[q].shuffledAnswers = answers;
          }

          playerData.started = true;
          playerData.currentQuestion = 0;
          playerData.correctAnswers = 0;
          playerData.wrongAnswers = 0;
          playerData.questions = result.results;
          session.set("playerData", JSON.stringify(playerData));

          readCurrecntQuestion(playerData, response);
          break;

        case 1:
          response
            .say("Sorry, but there are no questions in " + playerData.categoryName + " category. Please, select another category.")
            .reprompt(getRandomMessage(repromptTexts))
            .shouldEndSession(false);

        default:
          response
            .say("There was an error, please try again!")
            .reprompt(getRandomMessage(repromptTexts))
            .shouldEndSession(false);
      }
    });
  }
});

app.intent("AnswerIntent", {
  "slots": {"answer": "ANSWER_OPTIONS"},
  "utterances": [
    "My answer is {answer}",
    "The answer is {answer}",
    "Is {answer}",
    "{answer}"
  ],
}, function(request, response) {
  var session = request.getSession();
  var playerData = session.get('playerData');
  playerData = JSON.parse(playerData);

  if (!playerData.started) {
    response
      .say("There is no active game, start a new game before answering the questions.")
      .reprompt(getRandomMessage(repromptTexts))
      .shouldEndSession(false);
  }
  else {
    var answer = request.slot("answer");

    var correct = checkAnswer(playerData, answer);

    if (correct) {
      response
        .say(getRandomMessage(correctAnswerTexts))
        .reprompt(getRandomMessage(repromptTexts))
        .shouldEndSession(false);

      playerData.correctAnswers++;
    }
    else {
      response
        .say(getRandomMessage(incorrectAnswerTexts))
        .reprompt(getRandomMessage(repromptTexts))
        .shouldEndSession(false);

      playerData.wrongAnswers++;
    }

    playerData.currentQuestion++;
    session.set("playerData", JSON.stringify(playerData));

    if (playerData.currentQuestion < playerData.questions.length) {
      response.say("Next question.");
      readCurrecntQuestion(playerData, response);
    }
    else {
      var correctAnswers = playerData.correctAnswers;

      playerData.started = false;
      playerData.currentQuestion = 0;
      playerData.correctAnswers = 0;
      playerData.wrongAnswers = 0;
      playerData.questions = [];
      session.set("playerData", JSON.stringify(playerData));

      response
        .say("The game is over, you answered " + correctAnswers + " questions correctly!" +
          getRandomMessage(finalScoreTexts[correctAnswers]) +
          ". To start a new game, just say start.")
        .reprompt(getRandomMessage(repromptTexts))
        .shouldEndSession(false);

    }
  }
});

app.intent("waitIntent", {
  "slots": {},
  "utterances": [
    "Wait"
  ],
}, function(request, response) {
  var session = request.getSession();
  var playerData = session.get('playerData');
  playerData = JSON.parse(playerData);

  response
    .say(getRandomMessage(waitTexts))
    .reprompt(getRandomMessage(repromptTexts))
    .shouldEndSession(false);
});


app.intent("repeatIntent", {
  "slots": {},
  "utterances": [
    "Repeat"
  ],
}, function(request, response) {
  var session = request.getSession();
  var playerData = session.get('playerData');
  playerData = JSON.parse(playerData);

  if (!playerData.started) {
    response
      .say("There is no question to repeat.")
      .reprompt(getRandomMessage(repromptTexts))
      .shouldEndSession(false);
  }
  else {
    response
      .say(getRandomMessage(repeatTexts))
      .reprompt(getRandomMessage(repromptTexts))
      .shouldEndSession(false);

    readCurrecntQuestion(playerData, response);
  }
});

app.intent("stopIntent", {
  "slots": {},
  "utterances": [
    "Stop"
  ],
}, function(request, response) {
  var session = request.getSession();
  var playerData = session.get('playerData');
  playerData = JSON.parse(playerData);

  response
    .say("Good bye!");
});

module.exports = app;

//=================================================================

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random()*messages.length)];
}

function getTriviaData(playerData) {
  var apiURL = triviaAPI
    .replace("{CATEGORY}", playerData.category)
    .replace("{DIFFICULTY}", playerData.difficulty);

  var options = {
    uri: apiURL,
    json: true
  };

  return rp(options).then(function(result) {
    return result;
  });
}

function shuffle(a) {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}

function readCurrecntQuestion(playerData, response) {
  var currentQuestion = playerData.questions[playerData.currentQuestion];
  var question = currentQuestion.question;

  // Add answers
  question += ", ";
  for (i in currentQuestion.shuffledAnswers) {
    question += answerMarks[i] + ', ' + currentQuestion.shuffledAnswers[i] + ', ';
  }

  console.log(question);
  console.log(currentQuestion.correct_answer);

  response
    .say(question)
    .reprompt(getRandomMessage(repromptTexts))
    .shouldEndSession(false);
}

function checkAnswer(playerData, answer) {
  var currentQuestion = playerData.questions[playerData.currentQuestion];
  answer = answer.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  answer = answer.toUpperCase();

  return answerMarks.indexOf(answer) == currentQuestion.shuffledAnswers.indexOf(currentQuestion.correct_answer);
}

// DB OPERATIONS
function deleteSession(id) {
  var connection;
  db.createConnection(config.db_credentials)
    .then(function(conn){
      connection = conn;
      var result = connection.query('DELETE FROM session WHERE uid="' + id + '"');
      connection.end();
      return result;
    });
}

function sessionUpdate(id, data) {
  var connection;
  db.createConnection(config.db_credentials)
    .then(function(conn){
      connection = conn;
      var result = connection.query('SELECT id FROM session WHERE uid="' + id + '"');
      return result;
    }).then(function(rows){
      if (rows.length) {
        // UPDATE
        connection.query("UPDATE session SET data='" + JSON.stringify(data) + "' WHERE uid='" + id + "'");
        connection.end();
      }
      else {
        // INSERT
        connection.query("INSERT INTO session (uid, data) VALUES ('" + id + "', '" + JSON.stringify(data) + "')");
        connection.end();
      }
    });
}

function restoreSession(id, session) {

  var connection;
  db.createConnection(config.db_credentials)
    .then(function(conn){
      connection = conn;
      var result = connection.query('SELECT data FROM session WHERE uid="' + id + '"');
      connection.end();
      return result;
    }).then(function(rows){
      if (rows.length) {
        // RESTORE
        // session.set("playerData", JSON.stringify(playerData));
        console.log(rows[0].data);
        var buffer = new Buffer( rows[0].data );
        var bufferBase64 = buffer.toString('base64');
        console.log(bufferBase64);
      }
      else {
        // nothing to restore
      }
    });
}
