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
	_ = require('lodash'),
	async = require('async'),
	scraper = require('google-search-scraper'),
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

app.get('/results', function (req, res) {
	let linkCounter = 5
	let links = []
	let text = []
	let path = req.session.topic
	var google = {
			  query: 'cnn.com ' + path.toString(),
			  age: 'y',
			  limit: 5
			};
	
		scraper.search(google, function(err, url) {
			  // This is called for each result
			  if(err) throw err;
			  console.log(url)
			  if (linkCounter > 0) {
				  links.push(url)
			  }
			  linkCounter--
			  if (linkCounter == 0){
				  let options = {
						  uri: links[0],
						  transform: function (body) {
						    return cheerio.load(body);
						  }
						};
						rp(options)
					    .then(function(data)  {
						    text.push(data("#storytext").text())

						    res.render('results',
						    { 
						    	  title: 'Results',
						    	  topic: req.session.topic,
						    	  text: text[0]
						    	})
						    	
						    //	console.log(req.session.topic)
						   	//console.log(path)
						    	console.log(options.uri)
						    	console.log(text)
						    	
					    });
			  }
			});

		
	
    
})

//--------------------------------------------------------------
// Domain Scraping
// --------------------------------------------------------------
	//var url = 'http://www.cnn.com/';
	//var path = function (req, res){
	//	req.session.topic = req.body.topic
	//	res.send(200)
	//}
	//console.log(path)
	//var search = url + path
	
//request(url, function(error, res, body){
//	var links = [];
//	var $ = cheerio.load(body);
//	$('a').each(function(i, elem){
//	console.log($(elem).text(), elem.attribs.href);
//	links.push(elem);
//	});
//});


//console.log(data)

app.listen(3000)

console.log("Server started...")
    
  