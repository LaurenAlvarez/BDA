/*
 * Module dependencies
 */
var express = require('express'),
	session = require('express-session'),
    stylus = require('stylus'),
    nib = require('nib'),
    rp = require('request-promise'),
	cheerio = require('cheerio'),
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
	let options = {
	  uri: `http://money.cnn.com/2017/04/04/pf/equal-pay-day-gender-pay-gap/index.html`,
	  transform: function (body) {
	    return cheerio.load(body);
	  }
	};
	rp(options)
    .then(function(data)  {
    	let text = data("#storytext").text()
    res.render('results',
    { 
    	  title: 'Results',
    	  topic: req.session.topic,
    	  text: text
    	}) 
    	console.log(req.session.topic)
    	console.log(text)
    });
})




//console.log(data)

app.listen(3000)

console.log("Server started...")
    
  