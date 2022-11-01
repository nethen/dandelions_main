class SquareHolder {
	constructor (x, y){
		this.position = {x: x, y: y};
		this.state = Math.floor(Math.random() * 5);
	}


}

let tempSquares = [];
const SQUARES = 100;

const http = require('http')
const express = require('express')

const app = express()
app.use(express.static('public/'))

app.set('port', '3000')

const server = http.createServer(app)
server.on('listening', () => {
 console.log('Listening on port 3000')
})

for (let i = 0; i < SQUARES; i++){
    for (let j = 0; j < SQUARES; j++){
    	tempSquares.push(new SquareHolder(i * 32,j * 32));
    }
  }

// // Web sockets
// const io = require('socket.io')(server,{
//     allowEIO3: true // false by default
// })

// Web sockets
const io = require('socket.io')(server)

io.sockets.on('connection', (socket) => {
	console.log('Client connected: ' + socket.id)
	//console.log(tempSquares)
	// socket.on('squareRequest', () => {
	// 	io.emit('squareRequest',tempSquares);
	// });
	io.emit('squareRequest', tempSquares);
	
	//socket.emit('squares',tempSquares);
	socket.on('mouse', (data) => socket.broadcast.emit('mouse', data))
	socket.on('squareUpdate',(data) => console.log(data));
	socket.on('disconnect', () => console.log('Client has disconnected'))
})


server.listen('3000')

