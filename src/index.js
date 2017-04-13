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
 *                  Mar 22, 2017    - Replace askWithCard with askWithCardStandard method in 
 *                                      order to show the product image
 *                                  - Add setupCardContent and setupProductImage methods
 *                  Mar 29, 2017    - Add handling to display Walmart and BestBuy logos 
 *                                    for the card image of these stores since the image URL
 *                                    cannot be properly rendered in the Amazon Echo page or
 *                                    in the Alexa companion app
 *                  Apr 11, 2017    - Add handling when the slot value of the first intent is
 *                                    "price of" or "price off"
 *                  Apr 12, 2017    - Create getProductToSearch and getStoreName functions 
 */


/**
 * App ID for the skill
 */
var APP_ID = "amzn1.ask.skill.36d502a4-96b4-4bd2-a29b-f8b1214bad8e"; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var https = require('https');

/**
 * Comparison Guru helper functions
 */
var CGDataHelper = require('./cgHelper');

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
    "bestbuy": "https://cguru-quasar6.rhcloud.com/cheapest/bestbuy/",
    "walmart": "https://cguru-quasar6.rhcloud.com/cheapest/walmart/",
    "ebay": "https://cguru-quasar6.rhcloud.com/cheapest/ebay/",
    "amazon": "https://cguru-quasar6.rhcloud.com/cheapest/amazon/"
};

/**
 * URL prefix containing store logo images
 */
var urlLogoPrefix = {
    "bestbuy": "https://s3.amazonaws.com/comparisonguru-pics/bestbuy.png",
    "walmart": "https://s3.amazonaws.com/comparisonguru-pics/walmart.png"
}

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
        var speechText = "With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada. To search for a product, say, get price of, then the product name. For example, get price of macbook air laptop.";
        var repromptText = "Now what product do you want to check?";
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
    var cardTitle = "Welcome to Comparison Guru";
    var repromptText = "<p>With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada.</p> <p>Now, what product do you want to check?</p>";
    var speechText = "<p>Welcome to Comparison Guru.</p> <p>What product do you want to check?</p>";
    var cardOutput = "With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada. To search for a product, please say, \"Get the price of \", followed by the product name.\n\nFor example:\n\"Get the price of macbook air laptop\"";
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
    var repromptText = "With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada.";
    
    // Extract the product information
    var cgDataHelper = new CGDataHelper();
    var productInfo = cgDataHelper.getProductToSearch((intent.slots.product).value);
    // Check if there is No valid product to be searched
    if (productInfo.name === "") {
        speechText = "Please try again. Say, \"get price of \", then the product. For example, \"get price of Samsung S7 phone\".";
        // cardContent = speechText;
        response.ask(speechText, repromptText);
        return;
    }
    var productToSearch = productInfo.name;
    var storeName = productInfo.store;    

    var sessionAttributes = {};
    // Read the first event, then set the count to 1
    sessionAttributes.index = 1;
    sessionAttributes.productToSearch = productToSearch;

    // var cardContent = "Price of " + productToSearch;

    fetchDataFromQuasar(productToSearch, storeName, function (events) {
        var speechText;

        if (events.length == 0) {
            speechText = "There is a problem connecting to Comparison Guru at this time. Please try again.";
            // cardContent = speechText;
            response.ask(speechText, repromptText);
        } else {
            sessionAttributes.text = events;
            session.attributes = sessionAttributes;
            events = events[0];
            var price = events.salePrice;
            var onSale = ", it is currently on sale";
            if (price == null) {
                price = events.price
                onSale = ""
            }
            speechText = price +  " " + events.currency + 
                    "<p>In " + events.store + onSale + ". The description is, " + events.name + ".</p><p>";

            if ((sessionAttributes.text).length > 1) {
                if ((sessionAttributes.text).length == 2) {
                    speechText += "I have " + ((sessionAttributes.text).length - 1) + " more result";
                } else {
                    speechText += "I have " + ((sessionAttributes.text).length - 1) + " more results"; 
                }
                speechText += " for this product. </p><p>Do you want to hear the next best price?</p>";
            } else {
                speechText += "I only have " + sessionAttributes.text.length + " result for this product.</p>";
            }
            console.log(speechText);

           var bestPrice = "<p>The best price of " + productToSearch + " is </p>";
           var speechOutput = {
                speech: "<speak>" + bestPrice + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };

            var repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };

            var cardTitle = "[1 / " + (sessionAttributes.text).length + "] " + productToSearch;
            response.askWithCardStandard(speechOutput, 
                        repromptOutput, 
                        cardTitle, 
                        setupCardContent(events), 
                        setupProductImage(events),
                        (sessionAttributes.text).length > 1 ? false : true);
        }
    });
}

/**
 * Sets up the content of the Alexa card to be shown
 * @param events 
 */
function setupCardContent(events) {
    var price = events.salePrice;
    if (price == null) {
        price = events.price
    }
    return "Price: " + price + " " + events.currency + "\n\nStore: " + events.store + "\n"+ events.url;
}

/**
 * Sets up the image of the product as part of the Alexa card to be shown
 */
function setupProductImage(events) {
    var cardImage = "https://";

    if (events.imageURL) {
        if (events.store == "bestbuy" || events.store == "walmart") {
            cardImage = urlLogoPrefix[events.store]
        } else {
            var strResult = (events.imageURL).split("://")
            cardImage += strResult[1];
        }
    }

    return cardImage;
}

/**
 * Gets a poster prepares the speech to reply to the user.
 */
function handleNextEventRequest(intent, session, response) {
    var sessionAttributes = session.attributes,
        result = sessionAttributes.text,
        speechText = "",
        cardContent = "",
        cardImage = "https",
        repromptText = "Do you want to check the next best price of the product?", 
        i;
    var cardTitle = "[" + (sessionAttributes.index + 1) + " / " + result.length + "] " + sessionAttributes.productToSearch;
    if (!result) {
        speechText = "With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada. Now, what product do you want to check?";
        // cardContent = speechText;
        response.ask(speechText, speechText);
    } else if (sessionAttributes.index >= result.length) {
        speechText = "There are no more price information. Try to search for another product by saying, get price of, then the product. For example, get price of XBox One game console.";
        response.ask(speechText, speechText)
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
            // cardContent = cardContent + result[sessionAttributes.index] + " ";
            cardContent = setupCardContent(result[sessionAttributes.index]);
            cardImage = setupProductImage(result[sessionAttributes.index]);
            sessionAttributes.index++;
        }
        if (sessionAttributes.index < result.length) {
            speechText = speechText + " <p>Wanna check the next best price of the product?</p>";
            // cardContent = cardContent + " Wanna check the next best price of the product?";
        } else {
            speechText = speechText + "<p> Those were the first " + result.length + " best prices</p>";
            // cardContent = cardContent + "<p> Those were the first " + paginationSize + " best prices</p>";
        }

        var speechOutput = {
            speech: "<speak>" + speechText + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.askWithCardStandard(speechOutput, 
                repromptOutput, 
                cardTitle, 
                cardContent, 
                cardImage,
                false);
    }
}

function fetchDataFromQuasar(name, storeName, eventCallback) {
    var url = urlPrefix[storeName] + name + "/undefined_category";
     
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
    // console.log('parseJson get called');
    var products = new Array();

    // console.log(inputText);
    // Parse the input Text to convert string into JS object 
    try {
        var textJson = JSON.parse(inputText);

        // Setup the number of entries
        var maxSize = textJson.length < 10 ? textJson.length : paginationSize;

        // Return the first index of the array since this contain the cheapest price
        for (var index = 0; index < maxSize; index++) {
            textJson[index].name = (textJson[index].name).replace("&", "and");
            products.push(textJson[index]);
        }
    } catch (e) {
    }
    return products;
}

// Expose ComparisonGuruSkill so we can test it.
exports.ComparisonGuruSkill = ComparisonGuruSkill;

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the ComparisonGuru Skill.
    var skill = new ComparisonGuruSkill();
    skill.execute(event, context);
};
