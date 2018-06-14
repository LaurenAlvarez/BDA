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
    lda = require('lda'),
    mla = require('mla');
    
	
      
// --------------------------------------------------------------
// Server Globals  
// --------------------------------------------------------------
var searchDomains = [
	{domain: 'money.cnn.com'},
	//{domain: 'www.wikipedia.com', sParams: ''},
	{domain: 'www.bbc.com', sParams: ''},
	{domain: 'www.nytimes.com'},
	{domain: 'www.foxnews.com'},
	//{domain: 'www.wsj.com'},
	//{domain: 'www.cnn.com'},
	//{domain: 'www.cbsnews.com', sParams: ''},
	//{domain: 'www.nbcnews.com'},
	{domain: 'www.latimes.com'},
	{domain: 'www.huffingtonpost.com'},
	{domain: 'www.theblaze.com', sParams: ''},
	//{domain: 'townhall.com', sParams: ''},
	{domain: 'www.nationalreview.com', sParams: ''},
	//{domain: 'www.newsmax.com', sParams: ''},
	//{domain: 'www.redstate.com', sParams: ''},
	//{domain: 'www.theatlantic.com', sParams: ''},
    ],
	nUrls = 5,
	articleMinimum = 300;

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
      searchPromises = [],
      scrapePromises = [],
      articleTexts = [],
      mappy = {};
  
  // Create search promises
  for (let k = 0; k < searchDomains.length; k++ ) {
    searchPromises.push(
      new Promise(function (resolve, reject) {
        let query = "site:" + searchDomains[k].domain + " " + subject 
            + (searchDomains[k].sParams !== undefined? searchDomains[k].sParams : ' filetype:html');
        sec.google(query).then(function(result){
          for (let i= 0; i < result.links.length; i++ ){
        	  	linkDomain = result.links[i].split("/")[2]
        	  	if (searchDomains[k].domain !== linkDomain){
        	  	  result.links.splice(i, 1)
        	  	  i--
        	  	}
          }
          console.log(result)
          resolve(result);
          //purge any results that don't match the searchDomain[k] from the search
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
    	  //console.log(domain)
	  for (let i = 0; i < domain.links.length && i < nUrls; i++) {
	    scrapePromises.push(
	      new Promise(function(resolve, reject){
	        let options = {
	      	          uri: domain.links[i],
	      	          transform: function(body){
	                    return cheerio.load(body);
	                  }
	             };
	          rp(options).then(function(data)  {
	            resolve(data);
	          }, errHandler)
	    	  })
	    );
	   }
    }
    return Promise.all(scrapePromises);
  
  // Sanitize scraped article texts
  }, errHandler).then(function (scrapedArticles) {
      for (let j = 0; j < scrapedArticles.length; j++){
        let articleDetails = extractor(scrapedArticles[j].html());
        if (articleDetails.canonicalLink === undefined){
        	  continue;
        }
        if (articleDetails.text.length <= articleMinimum){
        	  continue;
        }
        let publisher = articleDetails.canonicalLink.split("/")[2];
        if (mappy[publisher] === undefined){
          mappy[publisher] = [];
        }
        let sanitize = wordsOnly(striptags(articleDetails.text)).toUpperCase();
        mappy[publisher].push(sanitize);
        console.log(publisher);
        console.log(sanitize.length);
        console.log(j)
        console.log("-------------------------------------------");
      }
   
  // Perform LDA Topic Modeling
      //console.log(mappy)
      let allText = Object.values(mappy)
      let flatText = [].concat.apply([], allText);
      //console.log(flatText)
      let ldaResult = lda(flatText, 3, 5, null, 0.2, 0.05);
      console.log(ldaResult);
    }, errHandler);
  
  // Render Results Page
  
  res.render('results',
    { 
      title: 'Results'
    })
    
})


app.listen(3000)

console.log("Server started...")
    
  