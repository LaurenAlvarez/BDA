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
    sec = require('google-it'),
    extractor = require('unfluff'),
    app = express(),
    striptags = require('striptags'),
    wordsOnly = require('words-only'),
    lda = require('lda'),
    mla = require('mla'),
    in_a = require('in-a-nutshell'),
    removePunctuation = require('remove-punctuation');
    
	
      
// --------------------------------------------------------------
// Server Globals  
// --------------------------------------------------------------
var searchDomains = [
	{domain: 'money.cnn.com'},
	//{domain: 'www.wikipedia.com', sParams: ''},
	{domain: 'www.bbc.com', sParams: ''},
	//{domain: 'www.nytimes.com'},
	{domain: 'www.foxnews.com'},
	//{domain: 'www.wsj.com'},
	{domain: 'www.cnn.com'},
	//{domain: 'www.cbsnews.com', sParams: ''},
	//{domain: 'www.nbcnews.com'},
	//{domain: 'www.latimes.com'},
	//{domain: 'www.huffingtonpost.com'},
	{domain: 'www.theblaze.com', sParams: ''},
	//{domain: 'townhall.com', sParams: ''},
	//{domain: 'www.nationalreview.com', sParams: ''},
	//{domain: 'www.newsmax.com', sParams: ''},
	//{domain: 'www.redstate.com', sParams: ''},
	//{domain: 'www.theatlantic.com', sParams: ''},
	{domain: 'www.independent.co.uk'}
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
      processedTexts = {};
  
  // Create search promises
  for (let k = 0; k < searchDomains.length; k++ ) {
    searchPromises.push(
      new Promise(function (resolve, reject) {
        let query = "site:" + searchDomains[k].domain + " " + subject 
            + (searchDomains[k].sParams !== undefined? searchDomains[k].sParams : ' filetype:html');
        try{
        	  sec({'query': query}).then(function(result){
            console.log(result)	
            for (let i= 0; i < result.length; i++ ){
          	  	let linkDomain = result[i].link.split("/")[2]
          	  	if (searchDomains[k].domain !== linkDomain){
          	  	  result.links.splice(i, 1)
          	  	  i--
          	  	}
            }
            //console.log(result)
            resolve(result);
            //purge any results that don't match the searchDomain[k] from the search
          }, errHandler);
        } catch (err){
        	  console.log(err)
        }
      })
    );
  }
  
  // Scrape article texts from each search URL
  Promise.all(searchPromises).then(function (searchResults) {
	  //console.log(searchResults)
    for (let domain of searchResults) {
      // TODO: Ensure that a particular domain *has* nURLs to scan,
      // otherwise, the below breaks (BBC guilty of this)
      // TODO: What if returned search results have other domains
      // than the ones requested?
    	  //console.log(domain)
	  for (let i = 0; i < domain.length && i < nUrls; i++) {
	    scrapePromises.push(
	      new Promise(function(resolve, reject){
	        let options = {
	      	          uri: domain[i].link,
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
        if (processedTexts[publisher] === undefined){
          processedTexts[publisher] = {rawText: [], saniText: [], sumText: []};
        }
        let sanitize = wordsOnly(striptags(articleDetails.text)).toUpperCase();
        let cleanText = removePunctuation(sanitize)
        processedTexts[publisher].saniText.push(cleanText);
        processedTexts[publisher].rawText.push(articleDetails.text);
        console.log(publisher);
        //console.log(cleanText.length);
        console.log(j)
        console.log("-------------------------------------------");
      }
      //console.log(processedTexts)
     // summarizes the text 
      let articleObjs = Object.values(processedTexts)
      for ( let publisher of articleObjs){
    	  	let rawText = publisher.rawText
    	  	//console.log(rawText)
    	  	for (let i = 0; i < rawText.length; i++ ){
    	  	  let summary = in_a.nutshell(rawText[i], 2);
    	  	  //console.log(summary)
    	  	  console.log(i)
    	  	  console.log("-------------------------------------------");
    	  	  console.log("-------------------------------------------");
    	  	  publisher.sumText.push(summary)
    	  	}
      }
      
      // making array for processedTexts to be able to use LDA
      let ldaTexts = articleObjs.map((publisherObj) => {
    	  	return publisherObj.sumText
      })
      // Perform LDA Topic Modeling
      ldaTexts = [].concat.apply([], ldaTexts);
      let ldaResult = lda(ldaTexts, 3, 5);
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
    
  