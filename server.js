console.log("server is listening...")

var express = require('express');
var app = express();

app.use(express.static('UserSite'));

function sayHello(request, response){
	reponse.send("hello!")
}

var server = app.listen(3000, listening);

function listening(){
	console.log("listening...");
}
