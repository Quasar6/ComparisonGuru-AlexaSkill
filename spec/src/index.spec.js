var index = require('../../src/index'),
    framework = require('../alexa-test-framework'),
    intent = framework.intent,
    session = framework.session,
    response = framework.response;

describe('index', function() {
    var comparisonGuru;
    // var funcTest;
    // var testIndex;
    framework.beforeEachMatchers();
    beforeEach(function() {
       
        comparisonGuru = new index.ComparisonGuruSkill();
        
    });
    
    it('GetFirstEventIntent', function() {
        var func = comparisonGuru.intentHandlers[ 'GetFirstEventIntent' ](intent, session, response);
        // expect(comparisonGuru.handleFirstEventRequest).toHaveBeenCalled();
        // response.askWithCard(speechOutput, repromptOutput, cardTitle, cardContent);
        // expect(response.call).toHaveBeenCalled();
        // expect(fetchDataFromQuasar).toHaveBeenCalled();
        // args = response.tellWithCard.argsForCall[ 0 ];
        // expect(args[ 0 ]).isSSML('Hello World!');
        // expect(args[ 1 ]).toEqual(jasmine.any(String));
        // expect(args[ 2 ]).toEqual(jasmine.any(String));
    });
    
    it('AMAZON.HelpIntent', function() {
        comparisonGuru.intentHandlers[ 'AMAZON.HelpIntent' ](intent, session, response);

        expect(response.ask).toHaveBeenCalled();
        args = response.ask.argsForCall[ 0 ];
        expect(args[0].speech).toEqual('With Comparison Guru, you can compare product prices across major online shopping stores like Amazon, Best Buy, eBay, and Walmart. To search for a product, say, get price of, then the product name. For example, get price of macbook air laptop. Now, what product do you want to check?');
        expect(args[1].speech).toEqual("What product do you want to check?");
    });

    it('AMAZON.StopIntent', function() {
        comparisonGuru.intentHandlers[ 'AMAZON.StopIntent' ](intent, session, response);
        expect(response.tell).toHaveBeenCalled();
    });

    it('AMAZON.CancelIntent', function() {
        comparisonGuru.intentHandlers[ 'AMAZON.CancelIntent' ](intent, session, response);
        expect(response.tell).toHaveBeenCalled();
    });
});