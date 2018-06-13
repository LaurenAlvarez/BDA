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
var searchDomains = [
      'money.cnn.com',
      //'encyclopedia.com',
      'bbc.com',
      'nytimes.com',
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
    res.render('index', { title : 'Home' });
});
app.post('/search', function(req, res){
  req.session.topic = req.body.topic
  res.send(200)
});

app.get('/results', function (req, res) {
  let subject = req.session.topic,
      result = [],
      nUrls = 5,
      searchPromises = [],
      scrapePromises = [],
      articleTexts = [],
      mappy = {};
  
  // Create search promises
  for (let k = 0; k < searchDomains.length; k++ ) {
    searchPromises.push(
      new Promise(function (resolve, reject) {
        let query = "site:" + searchDomains[k] + " " + subject + " filetype:html";
        sec.google(query).then(function(result){
          resolve(result);
        }, errHandler);
      })
    );
  }
  
  // Scrape article texts from each search URL
  Promise.all(searchPromises).then(function (searchResults) {
    for (let domain of searchResults) {
      // TODO: Ensure that a particular domain *has* nURLs to scan,
      // otherwise, the below breaks (BBC guilty of this)
      // TODO: What if returned search results have other domains
      // than the ones requested?
    	  console.log(domain)
	  for (let i = 0; i <= nUrls && domain.links.length >= nUrls ; i++) {
	    scrapePromises.push(
	      new Promise(function(resolve, reject){
	    	  if (domain.links[i].split("/")[2] === domain.links[i+1].split("/")[2]){
	        let options = {
	      	          uri: domain.links[i],
	      	          transform: function(body){
	                    return cheerio.load(body);
	                  }
	             };
	          rp(options).then(function(data)  {
	            resolve(data);
	          }, errHandler)
	    	  }
	    	  })
	    );
	   }
    }
    return Promise.all(scrapePromises);
  
  // Sanitize scraped article texts
  }, errHandler).then(function (scrapedArticles) {
      for (j = 0; j < scrapedArticles.length; j++){
        let articleDetails = extractor(scrapedArticles[j].html());
        let publisher = articleDetails.canonicalLink.split("/")[2];
        if (mappy[publisher] === undefined){
          mappy[publisher] = [];
        }
        let sanitize = wordsOnly(striptags(articleDetails.text)).toUpperCase();
        mappy[publisher].push(sanitize);
        console.log(publisher);
        //console.log(sanitize);
        console.log(j)
        console.log("-------------------------------------------");
      }
   
  // Perform LDA Topic Modeling
      let allText = Object.values(mappy)
      let flatText = [].concat.apply([], allText);
      let ldaResult = lda(flatText, 3, 5);
      console.log(ldaResult);
    }, errHandler);
  
  // Render Results Page
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
    
  