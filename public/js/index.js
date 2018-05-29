$("#search")
.click(function (){
	let topic = $("#topic").val()
	$.post("/search", {topic: topic})
	.done(function(){
		window.location = "/results"
	})
})

const rp = require('request-promise');
const cheerio = require('cheerio');
const options = {
		  uri: `http://money.cnn.com/2017/04/04/pf/equal-pay-day-gender-pay-gap/index.html`,
		  transform: function (body) {
		    return cheerio.load(body);
		  }
		};
rp(options)
.then(($) => {
  console.log($);
})
.catch((err) => {
  console.log(err);
});
