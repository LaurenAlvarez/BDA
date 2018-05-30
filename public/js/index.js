$("#search")
.click(function (){
	let topic = $("#topic").val()
	$.post("/search", {topic: topic})
	.done(function(){
		window.location = "/results"
	})
})


