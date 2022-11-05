class SquareHolder {
	constructor (x, y){
		this.position = {x: x, y: y};
		this.state = Math.floor(Math.random() * 5);
	}


}

let loadSquares = [];
let tempSquares = [];
const SQUARES = 100;

const http = require('http')
const express = require('express')
const PORT = process.env.PORT || 3000

const app = express()
app.use(express.static('public/'))

app.set('port', 'PORT')

const server = http.createServer(app)
server.on('listening', () => {
 console.log('Listening on port '+PORT)
})

for (let i = 0; i < SQUARES; i++){
    for (let j = 0; j < SQUARES; j++){
    	loadSquares.push(new SquareHolder(i * 32,j * 32));
    }
  }

// // Web sockets
// const io = require('socket.io')(server,{
//     allowEIO3: true // false by default
// })

// Web sockets
const io = require('socket.io')(server)

let serverRefresh = setInterval(function(){
	io.emit('serverRefresh', tempSquares); 
	tempSquares.forEach((element) => {
		const pos = element.position;
		const a = loadSquares.find((findElement) => findElement.position.x == element.position.x && findElement.position.y == element.position.y);
		console.log( Math.log2(element.state) - 1);
		console.log(a);
		a.state = Math.log2(element.state) - 1;
	});
	tempSquares = [];
}, 10000);

io.sockets.on('connection', (socket) => {
	console.log('Client connected: ' + socket.id)
	//console.log(tempSquares)
	// socket.on('squareRequest', () => {
	// 	io.emit('squareRequest',tempSquares);
	// });
	//io.emit('squareRequest', tempSquares);
	socket.emit('squareRequest', loadSquares);
	// let serverRefresh = setInterval(function(){
	// 	io.emit('serverRefresh', new Date()); 
	// 	console.log("emit");
	// }, 10000);

	// socket.on('disconnect', function () {
    //     clearInterval(serverRefresh);
    // });

	//socket.emit('squares',tempSquares);
	socket.on('mouse', (data) => socket.broadcast.emit('mouse', data))
	socket.on('squareUpdate',(data) => {
		console.log(data);
		tempSquares.push(data);
	});
	socket.on('disconnect', () => console.log('Client has disconnected'))
})


server.listen(PORT)

