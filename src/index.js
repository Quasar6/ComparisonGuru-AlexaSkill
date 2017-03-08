/**
 * Team Name: Quasar
 * Description:
 * 
 * - Web service: communicate with an external web service to get the best price of a product (Quasar API)
 * - Pagination: after obtaining a list of events, read a small subset of events and wait for user prompt to read the next subset of events by maintaining session state
 * - Dialog and Session state: Handles two models, both a one-shot ask and tell model, and a multi-turn dialog model.
 * - SSML: Using SSML tags to control how Alexa renders the text-to-speech.
 *
 * Examples:
 * One-shot model:
 * User:  "Alexa, ask ComparisonGuru to get the cheapest of Google Pixel phone."
 *
 * Dialog model:
 * User:  "Alexa, open ComparisonGuru"
 * Alexa: "Welcome to Comparison Guru. What product you want to check?"
 * 
 * Change History:  Feb 6, 2017     - Created 
 *                  Feb 22, 2017    - Add logic to accomodate both sale and regular prices 
 */


/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var https = require('https');

/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * URL prefix to download history content from Quasar's backend
 */
var urlPrefix = 
{
    "general": "https://cguru-quasar6.rhcloud.com/cheapest/",
    "bestbuy": "https://cguru-quasar6.rhcloud.com/cheapest/",
    "walmart": "https://cguru-quasar6.rhcloud.com/cheapest/",
    "ebay": "https://cguru-quasar6.rhcloud.com/cheapest/",
    "amazon": "https://cguru-quasar6.rhcloud.com/cheapest/"
};

/**
 * Variable defining number of events to be read at one time
 */
var paginationSize = 10;

/**
 * Variable defining the length of the delimiter between events
 */
var delimiterSize = 2;

/**
 * ComparisonGuru is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var ComparisonGuruSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
ComparisonGuruSkill.prototype = Object.create(AlexaSkill.prototype);
ComparisonGuruSkill.prototype.constructor = ComparisonGuruSkill;

ComparisonGuruSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("ComparisonGuruSkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session init logic would go here
};

ComparisonGuruSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("ComparisonGuruSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

ComparisonGuruSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

ComparisonGuruSkill.prototype.intentHandlers = {

    "GetFirstEventIntent": function (intent, session, response) {
        handleFirstEventRequest(intent, session, response);
    },

    "GetNextEventIntent": function (intent, session, response) {
        handleNextEventRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada. Now, what product you want to check?";
        var repromptText = "What product you want to check?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    }
};

/**
 * Function to handle the onLaunch skill behavior
 */

function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var cardTitle = "Price Comparison Guru";
    var repromptText = "<p>With Comparison Guru, you can compare product prices across major online shopping stores in Canada.</p> <p>Now, what product you want to check?</p>";
    var speechText = "<p>Welcome to Comparison Guru.</p> <p>What product do you want to check?</p>";
    var cardOutput = "Comparison Guru. Name the product that you want to price check.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: "<speak>" + repromptText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    response.askWithCard(speechOutput, repromptOutput, cardTitle, cardOutput);
}

/**
 * Gets a poster prepares the speech to reply to the user.
 */
function handleFirstEventRequest(intent, session, response) {
    var storeName = "general";
    var productSlot = intent.slots.product;
    var productSlotValue = (productSlot.value);
    var storeSlot = intent.slots.store;
    if (storeSlot.value != null && storeSlot.value != "") {
        storeName = storeSlot.value;
    }

    // Get the product to search 
    var productToSearch = productSlotValue;
    if (productSlotValue.startsWith('price of ')) {
        productSlotValue.substring()
        productToSearch = productSlotValue.substring('price of '.length);
    }
    
    var daySlot = intent.slots.product;
    var repromptText = "With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada.";

    var sessionAttributes = {};
    // Read the first 3 events, then set the count to 3
    sessionAttributes.index = 1;

    var prefixContent = "<p>The best price of " + productToSearch + " is </p>";
    var cardContent = "Price of " + productToSearch;
    var cardTitle = "Price of " + productToSearch;

    fetchDataFromQuasar(productToSearch, storeName, function (events) {
        var speechText = "", i;
        sessionAttributes.text = events;
        session.attributes = sessionAttributes;

        events = events[0];
        if (events.length == 0) {
            speechText = "There is a problem connecting to Comparison Guru at this time. Please try again later.";
            cardContent = speechText;
            response.tell(speechText);
        } else {
            var price = events.salePrice;
            var onSale = ",it is currently on sale";
            if (price == null) {
                price = events.price
                onSale = ""
            }
            speechText = price +  " " + events.currency + 
                    "<p>In " + events.store + onSale + ", the description is, " + events.name + 
                    ".</p><p>Do you want to hear the next best price?</p>";
            var speechOutput = {
                speech: "<speak>" + prefixContent + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            var repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.askWithCard(speechOutput, repromptOutput, cardTitle, cardContent);
        }
    });
}

/**
 * Gets a poster prepares the speech to reply to the user.
 */
function handleNextEventRequest(intent, session, response) {
    var cardTitle = "More prices to check",
        sessionAttributes = session.attributes,
        result = sessionAttributes.text,
        speechText = "",
        cardContent = "",
        repromptText = "Do you want to check the next best price of the product?", 
        i;
    if (!result) {
        speechText = "With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada. Now, what product you want to check";
        cardContent = speechText;
    } else if (sessionAttributes.index >= result.length) {
        speechText = "There are no more price information. Try to search for another product by saying <break time = \"0.3s\"/> get price of .";
        cardContent = "There are no more price information. Try to search for another product by saying, get price of.";
    } else {
        for (i = 0; i < 1; i++) 
        {
            if (sessionAttributes.index>= result.length) {
                break;
            }
            var product = result[sessionAttributes.index];
            var price = product.salePrice;
            var onSale = "It is currently on sale in ";
            if (price == null) {
                price = product.price
                onSale = "In "
            }
            speechText = speechText + "<p>" + "The next best price is " + price + " " + product.currency + 
                            "</p><p>" + onSale + product.store + "</p> " + ", the description is, " + product.name;
            cardContent = cardContent + result[sessionAttributes.index] + " ";
            sessionAttributes.index++;
        }
        if (sessionAttributes.index < result.length) {
            speechText = speechText + " <p>Wanna check the next best price of the product?</p>";
            cardContent = cardContent + " Wanna check the next best price of the product?";
        } else {
            speechText = speechText + "<p> Those were the first " + paginationSize + " best prices</p>";
            cardContent = cardContent + "<p> Those were the first " + paginationSize + " best prices</p>";
        }
    }
    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard(speechOutput, repromptOutput, cardTitle, cardContent);
}

function fetchDataFromQuasar(name, storeName, eventCallback) {
    var url;
    if (urlPrefix[storeName] == null){
        url = urlPrefix["general"] + name + "/undefined_category";
    } else {
        url = urlPrefix[storeName] + name + "/undefined_category";
    }
     
    https.get(url, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var result = parseJson(body);
            eventCallback(result);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}

function parseJson(inputText) {
    console.log(inputText);
    // Parse the input Text to convert string into JS object 
    var textJson = JSON.parse(inputText);
    var products = new Array();

    // Return the first index of the array since this contain the cheapest price
    for (var index = 0; index < paginationSize; index++) {
        products.push(textJson[index]);
    }
    return products;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the ComparisonGuru Skill.
    var skill = new ComparisonGuruSkill();
    skill.execute(event, context);
};

