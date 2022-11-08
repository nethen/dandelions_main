//Object for loading tile data
class SquareHolder {
	constructor (x, y, state){
		this.position = {x: x, y: y};
		this.state = state;
	}
}

//Container arrays for sending data
let loadSquares = [];
let tempSquares = [];
let rippleSquares =[];
let placeholders = [];

//Size of canvas
const SQUARES = 100;
const SIZE = 64;

//Set up connection
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

const calcripple = (comparedState, updateState) => {
    if (updateState.state < Math.log2(comparedState.state.state)-2) updateState.state ++;
    else if (updateState.state > Math.log2(comparedState.state.state)-2) updateState.state --;
  }

//Create tiles based on constant X & Y
for (let i = 0; i < SQUARES; i++){
    for (let j = 0; j < SQUARES; j++){
    	loadSquares.push(new SquareHolder(i * SIZE,j * SIZE, Math.floor(Math.random() * 5)));
    }
  }


// Web sockets
const io = require('socket.io')(server)

let serverRefresh = setInterval(function(){
	//remove duplicates in temp inside of ripple buffer
	tempSquares.forEach((element) => {
		const foundDupe = rippleSquares.find(compareElement => compareElement.position.x == element.position.x && compareElement.position.y == element.position.y);
		if (foundDupe) rippleSquares.splice(rippleSquares.indexOf(foundDupe), 1)
	});

	rippleSquares.forEach(element => {
		element.state = element.state[0];
	});

	//clear placeholders
	placeholders=[];
	
	
	io.emit('serverRefresh', tempSquares); 

	tempSquares.forEach((element) => {
		const pos = element.position;
		const a = loadSquares.find((findElement) => findElement.position.x == element.position.x && findElement.position.y == element.position.y);
		// console.log( Math.log2(element.state) - 1);
		// console.log(a);
		//a.state = Math.log2(element.state) - 1;
	});

	loadSquares.forEach((element) => {
		const a = rippleSquares.find(newElement => newElement.position.x == element.position.x &&  newElement.position.y == element.position.y)	
		if (a) calcripple(a, element);
	});
	//if (rippleSquares) console.log(rippleSquares);
	io.emit('rippleSquares', rippleSquares);
	tempSquares = [];
	rippleSquares = [];
	countdown = 11;
}, 11000);

var countdown = 11;
setInterval(function() {
  countdown--;
  io.sockets.emit('timer', {countdown: countdown});
}, 1000);

io.sockets.on('connection', (socket) => {
	console.log('Client connected: ' + socket.id)

	socket.emit('pageLoad', [{x: Math.floor(Math.random()*5), y: Math.floor(Math.random()*5)},loadSquares,placeholders]);
	//socket.emit('pRequest', placeholders);

	socket.on('mouse', (data) => socket.broadcast.emit('mouse', data))
	
	//ON USER ACTION
	socket.on('squareUpdate',(data) => {
		//console.log(data);

		//CHECK IF USER IS SELECTING TILE
		if (data.selected === true) {
			tempSquares.push(new SquareHolder(data.position.x, data.position.y, data.state));
			placeholders.push({x: data.position.x, y: data.position.y, id: socket.id, onCanvas: true});
			io.emit('placeholderUpdate',{x: data.position.x, y: data.position.y, id: socket.id, onCanvas: true});
			//Iterate in a 3x3 area around selected tile
			for (let i = 0; i < 3; i++){
				for (let j = 0; j < 3; j++){
					let tempX = data.position.x + (SIZE * i) - SIZE;
					let tempY = data.position.y + (SIZE * j) - SIZE;

					if (tempX >= 0 && tempY >= 0){
						//Isolate tiles surrounding selected cell
						if (tempX != data.position.x || tempY != data.position.y) {
							//const a = rippleSquares.find(element => Object.is(element.position.x, tempX) && Object.is(element.position.y, tempY));
							const a = rippleSquares.find(element => element.position.x == tempX && element.position.y == tempY);
							//console.log(a);
							if (a) a.state.push({owner: data.position, state: data.state});
							else rippleSquares.push(new SquareHolder(tempX, tempY, [{owner: data.position, state: data.state}]));
						}
					}
				}
			}
		}
		//CHECK IF USER IS DESELECTING TILE
		else if (data.selected === false){
			io.emit('placeholderUpdate',{x: data.position.x, y: data.position.y, id: socket.id, onCanvas: false});
			const b = placeholders.find(element => element.x == data.position.x && element.y == data.position.y)
			placeholders.splice(placeholders.indexOf(b), 1);
			const a = tempSquares.find((element) => element.position.x == data.position.x && element.position.y == element.position.y);
			//remove states of ripple tiles owned by previously selected
			if (a){
			rippleSquares.forEach(element => {
				element.state.forEach(currTile => {
					if(currTile.owner.x == a.position.x && currTile.owner.y == a.position.y) element.state.splice(element.state.indexOf(currTile), 1);
				})
			})
			}
			rippleSquares = (rippleSquares.filter(element => element.state.length > 0));
			tempSquares.splice(tempSquares.indexOf(a),1);
		}
	});
	socket.on('disconnect', () => console.log('Client has disconnected'))
})


server.listen(PORT)

