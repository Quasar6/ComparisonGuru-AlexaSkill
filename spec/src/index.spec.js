var index = require('../../src/index'),
    framework = require('../alexa-test-framework'),
    intent = framework.intent,
    session = framework.session,
    response = framework.response;

describe('index', function() {
    var comparisonGuru;

    framework.beforeEachMatchers();
    beforeEach(function() {
        comparisonGuru = new index.ComparisonGuruSkill();
    });
    /*
    it('HelloWorldIntent', function() {
        helloWorld.intentHandlers.HelloWorldIntent(intent, session, response);

        expect(response.tellWithCard).toHaveBeenCalled();
        args = response.tellWithCard.argsForCall[ 0 ];
        expect(args[ 0 ]).isSSML('Hello World!');
        expect(args[ 1 ]).toEqual(jasmine.any(String));
        expect(args[ 2 ]).toEqual(jasmine.any(String));
    });
    */
    it('AMAZON.HelpIntent', function() {
        comparisonGuru.intentHandlers[ 'AMAZON.HelpIntent' ](intent, session, response);

        expect(response.ask).toHaveBeenCalled();
        args = response.ask.argsForCall[ 0 ];
        expect(args[0].speech).toEqual('With Comparison Guru, you can compare product prices across major online shopping stores in US and Canada. Now, what product you want to check?');
        expect(args[1].speech).toEqual("What product you want to check?");
    });
});