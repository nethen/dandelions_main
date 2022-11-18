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

// function updatePlaceable(){
// 	let filteredList = loadSquares.filter(element => element.state == -1 && 
// 	 loadSquares.some(otherElement => (Math.abs(element.position.x-otherElement.position.x) == SIZE && otherElement.position.y == element.position.y && otherElement.state > -1)) ||
// 	 loadSquares.some(otherElement => (Math.abs(element.position.y-otherElement.position.y) == SIZE && otherElement.position.x == element.position.x && otherElement.state > -1)));
// 	//console.log(filteredList);
// 	return(filteredList);
//   }

const calcripple = (comparedState, updateState) => {
	if (updateState.state == -1 || comparedState.state.state == -1) return;
    if (updateState.state < Math.log2(comparedState.state.state)-2) updateState.state ++;
    else if (updateState.state > Math.log2(comparedState.state.state)-2) updateState.state --;
  }

//Create tiles based on constant X & Y
for (let i = 0; i < SQUARES; i++){
    for (let j = 0; j < SQUARES; j++){
    	if (((i-4)%9 == 0) && ((j-4)%9 == 0)) loadSquares.push(new SquareHolder(i,j, Math.floor(Math.random() * 5)));
		else loadSquares.push(new SquareHolder(i,j, -1));
    }
  }


// Web sockets
const io = require('socket.io')(server)

let serverRefresh = setInterval(function(){
	//const x = (updatePlaceable());
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
	
	
	// io.emit('serverRefresh', tempSquares); 

	tempSquares.forEach((element) => {
		const pos = element.position;
		const a = loadSquares.find((findElement) => findElement.position.x == element.position.x && findElement.position.y == element.position.y);
		//console.log(element.state);
		if (element.state == -1)  a.state = -1;
		else a.state = Math.log2(element.state) - 2;
	});

	loadSquares.forEach((element) => {
		const a = rippleSquares.find(newElement => newElement.position.x == element.position.x &&  newElement.position.y == element.position.y)	
		if (a) calcripple(a, element);
	});
	//if (rippleSquares) console.log(rippleSquares);
	io.emit('rippleSquares', [tempSquares,rippleSquares]);
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
	//console.log(updatePlaceable());
	socket.emit('pageLoad', [{x: Math.floor(Math.random()*((SQUARES/10)+1)), y: Math.floor(Math.random()*((SQUARES/10)+1))},loadSquares,placeholders]);
	//socket.emit('pRequest', placeholders);

	socket.on('mouse', (data) => socket.broadcast.emit('mouse', data))
	
	//ON USER ACTION
	socket.on('squareCheck',(data) =>{
		console.log(loadSquares.find(element => data.position.x == element.position.x && data.position.y == element.position.y))
	})

	socket.on('squareUpdate',(data) => {
		//console.log(data);
		//CHECK IF USER IS SELECTING TILE
		if (data.selected === true) {
			const placeDupe = placeholders.find(element => element.id == socket.id);
			if (placeDupe){
				const tempDupe = tempSquares.find(element => element.position.x == placeDupe.x && element.position.y == placeDupe.y);
				tempSquares.splice(tempSquares.indexOf(tempDupe), 1);
				placeholders.splice(placeholders.indexOf(placeDupe), 1);
				io.emit('placeholderUpdate',{x: placeDupe.x, y: placeDupe.y, id: socket.id, onCanvas: false});
			}
			tempSquares.push(new SquareHolder(data.position.x, data.position.y, data.state));
			placeholders.push({x: data.position.x, y: data.position.y, id: socket.id, onCanvas: true});
			io.emit('placeholderUpdate',{x: data.position.x, y: data.position.y, id: socket.id, onCanvas: true});
			//Iterate in a 3x3 area around selected tile
			for (let i = 0; i < 3; i++){
				for (let j = 0; j < 3; j++){
					let tempX = data.position.x + (i) - 1;
					let tempY = data.position.y + (j) - 1;

					if (tempX >= 0 && tempY >= 0){
						//Isolate tiles surrounding selected cell
						if (tempX != data.position.x || tempY != data.position.y) {
							//const a = rippleSquares.find(element => Object.is(element.position.x, tempX) && Object.is(element.position.y, tempY));
							const a = rippleSquares.find(element => element.position.x == tempX && element.position.y == tempY);
							
							//console.log(data.state);
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

