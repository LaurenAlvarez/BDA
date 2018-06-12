// --------------------------------------------------------------
// Node Modules  
// --------------------------------------------------------------
var express = require('express'),
	  session = require('express-session'),
    stylus = require('stylus'),
    nib = require('nib'),
    rp = require('request-promise'),
    	cheerio = require('cheerio'),
    	request = require('request'),
    	sec = require('search-engine-client'),
    	extractor = require('unfluff'),
    	app = express(),
    	striptags = require('striptags'),
    	wordsOnly = require('words-only'),
    	lda = require('lda');
    	
// --------------------------------------------------------------
// Server Globals  
// --------------------------------------------------------------
var 	searchDomains = [
      	'money.cnn.com',
      	'bbc.com',
      	'foxnews.com'
    	];

//--------------------------------------------------------------
// Server Config
//--------------------------------------------------------------
	
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware({ 
  src: __dirname + '/public',
  compile: function(str, path) {
    return stylus(str)
      .set('filename', path)
      .use(nib())
  }
}));
app.use(express.static(__dirname + '/public'));
var bodyParser = require('body-parser');
app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies
app.use(session({ secret: 'this-is-a-secret-token', cookie: { maxAge: 60000 }}));

// --------------------------------------------------------------
// Server Routines  
// --------------------------------------------------------------

var errHandler = function(err) {
      console.log(err);
    };
    
    

// --------------------------------------------------------------
// Routes  
// --------------------------------------------------------------

app.get('/', function (req, res) {
    res.render('index',
    { title : 'Home' }
    )
});
app.post('/search', function(req, res){
	req.session.topic = req.body.topic
	res.send(200)
});

app.get('/results', function (req, res) {
	let path = req.session.topic,
      result = [],
	    nUrls = 5,
	    articleTexts = [],
	    mappy = {};
	
	for (let k = 0; k < searchDomains.length; k++ ) {
		let html = "site:" + searchDomains[k] + " " + path + " filetype:html";
		sec.google(html).then(function(result){
			let promises = []
			for(let i= 0; i < nUrls; i++){
				promises.push(
					new Promise(function(resolve, reject){
						let options = {
								uri: result.links[i],
								transform: function(body){
									return cheerio.load(body);
								}
							};
						//console.log(result);
						rp(options)
					    .then(function(data)  {
						    resolve(data);
						}, errHandler)
					})
				);
			}
			
			return Promise.all(promises)
		}, errHandler).then (function(result){
			for (j = 0; j < result.length; j++){
				data = extractor(result[j].html());
				let publisher = data.canonicalLink.split("/")[2]
				//console.log(data);
				if (mappy[publisher] === undefined){
					mappy[publisher] = [];
				}
				let sanitize = wordsOnly(striptags(data.text)).toUpperCase();
				mappy[publisher].push(sanitize);
				console.log(publisher);
				console.log(sanitize);
				console.log(j)
				console.log("-------------------------------------------");
			}
			let allText = Object.values(mappy)
			let flatText = [].concat.apply([], allText);
			//console.log(flatText);
			let ldaResult = lda(flatText, 3, 5);
			console.log(ldaResult);
		}, errHandler)	
	}
	/*
	res.render('results',
	  { 
	    title: 'Results',
	    	topic: req.session.topic,
	    	text: text
	  })
	  */
})


app.listen(3000)

console.log("Server started...")
    
  