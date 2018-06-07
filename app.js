/*
 * Module dependencies
 */
var express = require('express'),
	session = require('express-session'),
    stylus = require('stylus'),
    nib = require('nib'),
    rp = require('request-promise'),
	cheerio = require('cheerio'),
	request = require('request'),
	sec = require('search-engine-client');
	app = express()

	
function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
))
app.use(express.static(__dirname + '/public'))
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies
app.use(session({ secret: 'this-is-a-secret-token', cookie: { maxAge: 60000 }}));


// --------------------------------------------------------------
// Routes  
// --------------------------------------------------------------

app.get('/', function (req, res) {
    res.render('index',
    { title : 'Home' }
    )
    
})
app.post('/search', function(req, res){
	req.session.topic = req.body.topic
	res.send(200)
})

//--------------------------------------------------------------
// Domain Scraping
// --------------------------------------------------------------

app.get('/results', function (req, res) {
	let path = req.session.topic
	sec.google("cnn.com " + path).then(function(result){
	    console.log(result);
	});
	/*
	let linkPromises = urlSearcher(path)
	let links = []
	let addToLinks = function (url) {
		console.log(url)
		links.push(url)
	}
	let printLinks = function (url) {
		console.log(url)
	}
	Promise.all(linkPromises).then(printLinks)
	
	res.render('results',
	  { 
	    title: 'Results',
	    	topic: req.session.topic,
	    	text: text
	  })
	  */
})

//--------------------------------------------------------------
// Helper Functions
// --------------------------------------------------------------
/*
function urlSearcher(topic){
	let linkCounter = 5
	let links = []
	var google = {
			query: 'cnn.com ' + topic,
			age: 'y',
			limit: 5
		};
	while (linkCounter > 0){
		linkCounter--
		links.push( 
				//Async call:
				gss.getSearch(topic).then(function(response))
		)
	}
	return links;
}
*/
/*
function urlScraper(url){
    let textCounter = 5
    let text = []
    let options = {
			uri: url,
			transform: function (body) {
			    return cheerio.load(body);
			}
		};
	rp.(options)
	    .then(function(data)  {
		    if (textCounter > 0){
		    }
		    textCounter--
		    if (textCounter == 0){
		        text.push(data("#storytext").text());
		        let allTexts = text.concat().text
		    }
		}
}
*/
app.listen(3000)

console.log("Server started...")
    
  