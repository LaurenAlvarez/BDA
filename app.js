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
	extractor = require('node-article-extractor');
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
var errHandler = function(err) {
    console.log(err);
}

app.get('/results', function (req, res) {
	let path = req.session.topic
	let html = "cnn.com " + path
	let result = []
	let nUrls = 5
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
					rp(options)
				    .then(function(data)  {
					    resolve(data);
					}, errHandler)
				})
			)		
		}
		console.log(result);
		return Promise.all(promises)
	}, errHandler).then (function(result){
		data = extractor(result[0].html);
		console.log(result);
	}, errHandler)
	

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
    
  