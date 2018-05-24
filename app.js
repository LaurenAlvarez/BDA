/*
 * Module dependencies
 */
var express = require('express'),
    stylus = require('stylus'),
    nib = require('nib')

    var app = express()
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
    app.get('/', function (req, res) {
        res.render('index',
        { title : 'Home' }
        )
    })
    app.get('/results', function (req, res) {
        res.render('results',
        { title : 'Results' }
        )
    })
    app.post('/search', function(req, res){
    		console.log(req.body)
    		res.send(200)
    })
    
    
    app.listen(3000)
    
    console.log("Server started...")
    
    
    