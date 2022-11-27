p5.disableFriendlyErrors = true; // disables FES

//instantiate constants and global vars
const IMG_SIZE = 48;
const CANVAS_COUNT = 10;
const TIMER_DURATION = 8;
let socket;
let id;
let moveChosen = null;
//let moveType = Math.floor(Math.random()*6) - 1;
let moveType;
let globalPos;
//let placeable = [];
let placeable = new Set();

//encapsulate data related to tiles
class Square {
  constructor(x,y, state){
    //position relative to client & server (currently same)
    this.position = {x: x, y: y};
    //this.globalPos = {x: x, y: y};

    //current number of divisions in checkerboard & previous reference
    this.state = state;
    this.pState = state;

    //counter variable for animation
    this.counter = TIMER_DURATION;
    if (state == -1) this.srcWidth = (width/10);
    else this.srcWidth = state;
    this.moving = false;

    //owner of selected tile
    this.selected = "";
    this.selectable = false;
  }
  //changed display method to image-based rendering (avoid load on p5js)
  display(){
    if (this.state > 0){
      //if selected, make tile gray
      if (this.selected.length > 0){
        image(imgAlt,this.position.x * (width/10),this.position.y * (width/10),(width/10),(width/10),0,0,this.srcWidth, this.srcWidth);
        //check if current client selected tile
        if (this.selected == socket.id){
          image(client,this.position.x * (width/10),this.position.y* (width/10),(width/10),(width/10));
        } 
        //otherwise, indicate alternate socket selected tile
        else{
          image(clientAlt,this.position.x* (width/10),this.position.y* (width/10),(width/10),(width/10));
        }
      }
      //otherwise, default to black tile
      else image(img,this.position.x* (width/10),this.position.y* (width/10),(width/10),(width/10),0,0,this.srcWidth, this.srcWidth);
    } 
    
    else{
      if (this.placeable == true && moveType > -1){
        image(placeableTile,this.position.x* (width/10),this.position.y* (width/10),(width/10),(width/10));
      }
    }

    if (this.selected.length > 0){
      //check if current client selected tile
      if (this.selected == socket.id){
        image(client,this.position.x* (width/10),this.position.y* (width/10),(width/10),(width/10));
      } 
      //otherwise, indicate alternate socket selected tile
      else{
        image(clientAlt,this.position.x* (width/10),this.position.y* (width/10),(width/10),(width/10));
      }
    }
  }

  //calculate new state to animate into
  ripple(comparedState){
    if (this.state == -1) return;
    if (this.state < comparedState) this.state *= 2;
    else if (this.state > comparedState) this.state /= 2;
  }

  //allow animation
  startMoving(){
    this.moving = true;
    this.counter = 0;
  }

  //animate tile when states change
  update(){
    if (this.counter >= TIMER_DURATION){
      this.moving = false;
      this.pState = this.state;
      this.srcWidth = Math.floor(this.srcWidth);
      if (this.srcWidth != this.state) this.srcWidth = this.state;
    }
    if (this.moving && this.counter < TIMER_DURATION){
      this.counter ++;
      this.srcWidth += ((this.state - this.pState)/TIMER_DURATION);
    }
  }
}

let squares = []

//load all images ahead of intial paint (first draw)
function preload() {
 img = loadImage("assets/checker.png");
 imgAlt = loadImage("assets/checker_alt.png");
 client=loadImage("assets/client.png");
 clientAlt=loadImage("assets/client_alt.png");
 placeableTile=loadImage("assets/placeable.png");
}

function setup() {
  //Connect to server (localhost for debug)
  socket = io.connect('http://localhost:3000')
  //socket = io.connect('192.168.0.83:3000')
  //socket = io.connect('dandelions-iat222.herokuapp.com')
  socket.on('timer', function(data) {
    document.getElementById('counter').textContent = data.countdown;
  });
  //Check for incoming tile data on first load
  socket.on('pageLoad',(data) => {
    updateMoveText();
    squares = [];
    globalPos = {x: data[0].x * (CANVAS_COUNT-1), y: data[0].y * (CANVAS_COUNT-1)}
    console.log(globalPos)
    //Get first half of the packet (tile positions + states)
    data[1].forEach(function(square){
      //Add linearly into array for iteration (2 + x = starting position (2 = power 2 for start @ 4))
      let holdState = -1;
      if (square.state > -1) {
        holdState = Math.pow(2,2 + square.state);
        //console.log(holdState);
      }
      squares.push(new Square(square.position.x, square.position.y, holdState));
      //squares.push(new Square(square.position.x, square.position.y, Math.pow(2,2 + square.state)));
    });
    // placeable = updatePlaceable();
    //Get second half (selected tile positions & owners)
    data[2].forEach(function(element){
      //Find corresponding tile position in client cells. If a match is found, indicate client who made move
      let a = squares.find(square => square.position.x == element.x && square.position.y == element.y);
      if (a) a.selected = element.id;
    });
    //squares = squares.filter(element => {element.position.x < globalPos.x + 320 && element.position.x >= globalPos.x && element.position.y < globalPos.y + 320 && element.position.y >= globalPos.y});
    squares = squares.filter(element => element.position.x < globalPos.x + 10 && element.position.x >= globalPos.x && element.position.y < globalPos.y + 10 && element.position.y >= globalPos.y);
    squares.forEach(element => {element.position = {x: Math.floor(squares.indexOf(element)/10), y: (squares.indexOf(element) % 10) }});
    console.log(squares);
    updatePlaceable();
  });

  //Set up drawing conditions
  let initWidth;
  if (windowWidth < 512){
    if (windowWidth < 320) initWidth = 320;
    else initWidth = windowWidth - 32;
  }
  else if (windowWidth >= 512){
    initWidth = 480;
  }
  const p5 = createCanvas(initWidth, initWidth);
  p5.parent("canvas_container")
  p5.addClass("canvas_container__content");
  noSmooth();
  frameRate(30);

  //ONE TIME SOCKET LISTENERS GO INTO SETUP

  //If any placeholders are added, update canvas
  socket.on('placeholderUpdate',(data) => {
    if (data) {
      //Find corresponding square to position in placeholder
      let a = squares.find(square => square.position.x+globalPos.x == data.x && square.position.y+globalPos.y == data.y);
      if (a){
        //Assign owner/lack of owner based on command issued
        if (data.onCanvas == true){
          a.selected = data.id;
        } else {
          a.selected = "";
        }
      }
    }
  });

  //After the buffer period, clear all data
 /* socket.on('serverRefresh',(data) => {
    if (data) {
      //console.log(data); 
      // data.forEach((element) => {
      //   rippleAdjacent(element);
      // });

      //Remove saved chosen tile & deselect all tiles
      moveChosen = null;
      squares.forEach(element => {
        element.selected ="";
      })

      moveType = Math.floor(Math.random*6) - 1;
    }
  });*/

  //Animation callback
  socket.on('rippleSquares',(data) => {
    if (data) {
      //Remove saved chosen tile & deselect all tiles
      moveChosen = null;
      squares.forEach(element => {
        element.selected ="";
      })
      data[0].forEach(element => {
        //console.log(element);
        const x = squares.find(square => square.position.x+globalPos.x == element.position.x && square.position.y+globalPos.y == element.position.y)
        if (x){
          if (element.state > -1) x.srcWidth = element.state;
          x.state = element.state;
        }
      })

      updateMoveText();
      //moveType = 5;
      updatePlaceable();
      //placeable = updatePlaceable();
      //Find corresponding square to position in data & update state based on owner of ripple tile
      data[1].forEach(element => {
        const correspondingSquare = squares.find(square => square.position.x+globalPos.x == element.position.x && square.position.y+globalPos.y == element.position.y);
        //Start animation
        console.log(element.state.state);
        if (element.state.state > 0 && correspondingSquare){
          correspondingSquare.ripple(element.state.state);
          correspondingSquare.startMoving();
        }
      })
    }
  });
}

//Display all tiles every 0.3s
function draw() {
  background(255);
  for (let i = 0; i < squares.length; i++){
    squares[i].display();
    squares[i].update();
  }
  // squares.forEach(element => {
  //   element.display();
  //   element.update();
  // })
}

function mouseMoved() {
  if (moveType > -1 && [...placeable].some(element => (element.position.x * (width/10)) < mouseX && (element.position.x + 1) * (width/10) > mouseX && (element.position.y* (width/10)) < mouseY && (element.position.y + 1)* (width/10) > mouseY)) cursor(HAND);
  else if (moveType == -1 && squares.some(element => element.state > -1 && (element.position.x * (width/10)) < mouseX && (element.position.x + 1) * (width/10) > mouseX && (element.position.y* (width/10)) < mouseY && (element.position.y + 1)* (width/10) > mouseY)) cursor(HAND);
  else cursor(ARROW)
}

//Click callback
function mousePressed(event) {
  console.log(event)
  console.log("MOUSEDEBUG")
  console.log(mouseX);
  console.log(mouseY);
  //Find tile that was clicked
  const active = (element) => (element.position.x * (width/10) < mouseX && (element.position.x+1)* (width/10) > mouseX) && ((element.position.y)* (width/10) < mouseY && (element.position.y+1) * (width/10) > mouseY);
  const clickedSquare = squares.find(active);
  console.log(clickedSquare);
  if (keyIsDown(SHIFT)) {
    console.log("SRCWIDTH");
    console.log(clickedSquare.srcWidth);
    console.log("STATE");
    console.log(clickedSquare.state);
    console.log(clickedSquare.placeable)
    //socket.emit('squareCheck',{position: clickedSquare.position});
  }
  if((moveType > -1 && placeable.has(clickedSquare)) || (moveType == -1 && clickedSquare.state > -1)){
    //If the tile is not selected or is owned by current client
    if (clickedSquare && (clickedSquare.selected == "" || clickedSquare.selected == socket.id)){
      //Make a boolean variable for sending command to server
      let bool = false
      //If a move is not chosen, prepare boolean to let server know that it will be selected
      // if (moveChosen === null){
      //   bool = true;
      //  moveChosen = {x: clickedSquare.position.x, y: clickedSquare.position.y};
      //}
      //Otherwise, deselect tile 
      // else{
        // if (clickedSquare.selected){
        //   moveChosen = null;
        // }
      // }
      if (clickedSquare.selected == "") bool = true;
      //Send data of tile being selected to server
      //console.log(clickedSquare.state);
      //socket.emit('squareUpdate',{position: clickedSquare.position, state: clickedSquare.state, selected: bool});
      let tempMoveType = moveType;
      if (moveType > -1) tempMoveType = Math.pow(2,2 + tempMoveType);
      //alert(tempMoveType);
      socket.emit('squareUpdate',{position: {x: globalPos.x+ clickedSquare.position.x, y: globalPos.y+ clickedSquare.position.y}, state: tempMoveType, selected: bool});
    }
  }
}

function windowResized() {
  if (windowWidth >= 320 && windowWidth < 512){
    resizeCanvas(windowWidth-32, windowWidth-32);
  }
  else if (windowWidth >= 512){
    resizeCanvas(480, 480);
  }
  //resizeCanvas(windowWidth, windowHeight);
}

//Ripple command based on central square (defunct)
const rippleAdjacent = (centerSquare) => {
  const adjacentSquares = squares.filter(square => ( (Math.abs(square.position.x-centerSquare.position.x) < 2 ) && (Math.abs(square.position.y-centerSquare.position.y) < 2) && square != centerSquare));
  
  // for (let i = 0; i < adjacentSquares.length; i++){
    
  //   if(adjacentSquares[i].moving === true) return;
  //   adjacentSquares[i].ripple(centerSquare.state);
  //   adjacentSquares[i].startMoving();
  // }
  adjacentSquares.forEach(element => {
    if(element.moving === true) return;
    element.ripple(centerSquare.state);
    element.startMoving();
  })
}

function updatePlaceable(){
	// let filteredList = squares.filter(element => element.state == -1 && 
	//  squares.some(otherElement => (Math.abs(element.position.x-otherElement.position.x) == IMG_SIZE && otherElement.position.y == element.position.y && otherElement.state > -1)) ||
	//  squares.some(otherElement => (Math.abs(element.position.y-otherElement.position.y) == IMG_SIZE && otherElement.position.x == element.position.x && otherElement.state > -1)));
	// //console.log(filteredList);
  placeable.clear();
  for (let i = 0; i < squares.length; i++){
    squares[i].placeable = false;
    if(squares[i].state == -1 && (squares.some(otherElement => (Math.abs(squares[i].position.x-otherElement.position.x) == 1 && otherElement.position.y == squares[i].position.y && otherElement.state > -1)) ||
    squares.some(otherElement => (Math.abs(squares[i].position.y-otherElement.position.y) == 1 && otherElement.position.x == squares[i].position.x && otherElement.state > -1)))){
      placeable.add(squares[i]);
      squares[i].placeable = true;
    }
  }
	//return(filteredList);
}

const updateMoveText = () => {
  const currTiles = squares.filter(element => element.state > -1).length;
  if (currTiles > 1) moveType = (Math.floor(Math.random()*6)-1);
  else moveType = Math.floor(Math.random()*5);
  const move = document.querySelector('#move')
  const indicator = document.querySelector('#indicator')
    if(moveType > -1) {
      move.innerText = "Build";
      const path = "assets/stages/stage"+(moveType + 1)+".png";
      indicator.src = path
      if(indicator.classList.contains("bottomBar__indicator--inactive")) indicator.classList.remove("bottomBar__indicator--inactive");
    }
    else {
      move.innerText = "Erase";
      if(indicator.classList.contains("bottomBar__indicator--inactive") == false) indicator.classList.add("bottomBar__indicator--inactive");
    }
  
}