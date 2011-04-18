// Showing with the Express framework: http://expressjs.com/
// Express must be installed for this sample to work.

// Also utilizing Jdub's Twitter client: https://github.com/jdub/node-twitter
// This Twitter client must also be installed for this sample to work.

require('tropo-webapi');

var express = require('express');
var app = express.createServer();
var sys = require('sys');
var twitter = require('twitter');

// Enabling cookies so we can utilize the submitted Twitter handle throughout the application; this is built into Express.

app.configure(function() {
	app.use(express.cookieParser());
	app.use(express.session({ secret: "This is a secret." }));
});


// Required to process the HTTP body.
// req.body has the Object while req.rawBody has the JSON string.

app.configure(function(){
	app.use(express.bodyParser());
});

app.post('/', function(req, res){
	// Create a new instance of the TropoWebAPI object.
	
	var tropo = new TropoWebAPI();
	
	 // Extracting the channel from the session JSON so we can handle any inbound voice calls.
	 // The string of periods adds a delay to ensure the whole message is heard, Skype and other clients can add delays.
	
		if(req.body['session']['from']['channel'] == "VOICE") {

			tropo.say("........... This application is text only.  Please either send us an S M S, or send us an I, M, to Twit,er, at, tropo, dot, i, m, on Jabber. That's t w i t t e r, at tropo, dot i, m,");
		
		// Submits the instructions to Tropo, in this case the content of the 'say', as JSON.  This is used in every resource that follows.
		
			res.send(TropoJSON(tropo));
		
		}
	
		else {
		
		// Extracting the initialText, which is the body of the text message.
		
			var initialText = req.body['session']['initialText'];
		
		// Determining if the first character in the message is an @ symbol, indicating the Twitter username was submitted direct.
		
			if(initialText.charAt(0) == '@') {
		
				var say = new Say("You provided " + initialText + ". Reply back with 1 if correct, with 2 to cancel.");	
				var choices = new Choices(null, null, "1,2");
			
				tropo.ask(choices, 2, null, null, "the_ask", null, null, say, 60, null);
			
				//'on' events indicate which resource to move to if the user provides valid or invalid input.
			
				tropo.on("continue", null, "/confirmation", true);
				tropo.on("incomplete", null, "/timeout_badchoice", true);
				
				// Defining session.name as the initialText - the user's input - for use in a later resource.
				
				req.session.name = initialText;
  				res.send(TropoJSON(tropo));
			}
		
			else {
			
			// If the user didn't submit a username with the first message, then we request it.  We use the [ANY] grammar to accept any text content.
			// Two asks are used to discard the user's first input.  That way if they send 'Hi!' as the first message, we don't attempt to use it as the Twitter ID.
			
				var say2 = new Say("");
				var choices2 = new Choices(null, null, "[ANY]");
			
				var say3 = new Say("Thank you for contacting Tropo.  Please provide us with your Twitter ID, including the @.");
				var choices3 = new Choices(null, null, "[ANY]");
	
				//	(choices, attempts, bargein, minConfidence, name, recognizer, required, say, timeout, voice);
			
				tropo.ask(choices2, 1, null, null, "the_ask2", null, null, say2, 60, null);
				tropo.ask(choices3, 2, null, null, "the_ask3", null, null, say3, 60, null);
				
				tropo.on("continue", null, "/answer", true);
				tropo.on("incomplete", null, "/timeout_badchoice", true);
		
				res.send(TropoJSON(tropo));
			}
		}
});

// This resource will be used if the user did not start off submitting a Twitter ID

app.post('/answer', function(req, res){
	
	var tropo = new TropoWebAPI();
	
	// Extracting the value from the result JSON.  We use [1] to extract the value from the second set of results, since the first set is 'throwaway' content.
	
	var the_choice = req.body['result']['actions'][1]['value'];
	var say4 = new Say("You entered " + the_choice + ". Reply back with 1 to confirm that's accurate, or 2 to cancel.");
	var choices4 = new Choices(null, null, "1,2");
	
	tropo.ask(choices4, 2, null, null, "the_ask4", null, null, say4, 30, null);
	
	tropo.on("continue", null, "/confirmation", true);
	tropo.on("incomplete", null, "/timeout_badchoice", true);
	
	// As before, defining the req.session.name as the user's input.
	
	req.session.name = the_choice;
	res.send(TropoJSON(tropo));
});

app.post('/confirmation', function(req, res){
	var tropo = new TropoWebAPI();
	var the_choice = req.body['result']['actions']['value'];
	
	if (the_choice ==  "1") {
		tropo.say("Thank you confirming.  Follow suggestion has been posted to our Twitter feed.");
		
		tropo.on("continue", null, "/twitter", true);
		
		res.send(TropoJSON(tropo));
	}
	else {
		tropo.say("Looks like you canceled your submission; please text us again if you want to start over.");
		
		res.send(TropoJSON(tropo));
	}

});

app.post('/timeout_badchoice', function(req, res){
	var tropo = new TropoWebAPI();
	tropo.say("Sorry, didn't get that.  Please try again.");

	res.send(TropoJSON(tropo));
});

app.post('/twitter', function(req, res){
	
	// This resource handles the posting of the Twitter status, utilizing the node-twitter Client.
	// You need to create an application using the Twitter API:  http://dev.twitter.com
	// Each of the keys are acquired by going into your apps and clicking Application Detail
	
	var tropo = new TropoWebAPI();
	
	var twit = new twitter({
		consumer_key : 'YOUR_CONSUMER_KEY',
		consumer_secret : 'YOUR_SECRET_CONSUMER_KEY',
		access_token_key : 'YOUR_ACCESS_TOKEN_KEY',
		access_token_secret : 'YOUR_SECRET_ACCESS_TOKEN'
	});
	
		twit.post('/statuses/update.json', { status: "Want to follow awesome people? Check out " + req.session.name + ", they're totally a-may-za-zing." }, function(data) {
		sys.puts(sys.inspect(data));
		});
	
	res.send(req.session.name);

});

// This launches the app on port 8000.  This is modifiable.

app.listen(8000);
console.log('Server running on port :8000');
