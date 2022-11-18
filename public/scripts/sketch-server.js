p5.disableFriendlyErrors = true; // disables FES

//instantiate constants and global vars
const IMG_SIZE = 48;
const CANVAS_COUNT = 100;
const TIMER_DURATION = 8;
let socket;
let id;
let moveChosen = null;
//let moveType = Math.floor(Math.random()*6) - 1;
let moveType = Math.floor(Math.random()*5)
console.log(moveType)
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
    if (state == -1) this.srcWidth = IMG_SIZE;
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
      image(imgAlt,this.position.x* IMG_SIZE,this.position.y* IMG_SIZE,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
      //check if current client selected tile
      if (this.selected == socket.id){
        image(client,this.position.x* IMG_SIZE,this.position.y* IMG_SIZE,IMG_SIZE,IMG_SIZE);
      } 
      //otherwise, indicate alternate socket selected tile
      else{
        image(clientAlt,this.position.x* IMG_SIZE,this.position.y* IMG_SIZE,IMG_SIZE,IMG_SIZE);
      }
    }
    //otherwise, default to black tile
    else image(img,this.position.x* IMG_SIZE,this.position.y* IMG_SIZE,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
    }

    else{
      if (this.placeable == true){
        image(placeableTile,this.position.x* IMG_SIZE,this.position.y* IMG_SIZE,IMG_SIZE,IMG_SIZE);
      }
    }

    if (this.selected.length > 0){
      //image(imgAlt,this.position.x,this.position.y,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
      //check if current client selected tile
      if (this.selected == socket.id){
        image(client,this.position.x* IMG_SIZE,this.position.y* IMG_SIZE,IMG_SIZE,IMG_SIZE);
      } 
      //otherwise, indicate alternate socket selected tile
      else{
        image(clientAlt,this.position.x* IMG_SIZE,this.position.y* IMG_SIZE,IMG_SIZE,IMG_SIZE);
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
  //Check for incoming tile data on first load
  socket.on('pageLoad',(data) => {
    squares = [];
    globalPos = {x: data[0].x, y: data[0].y}
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
  });

  //Set up drawing conditions
  createCanvas(IMG_SIZE*CANVAS_COUNT, IMG_SIZE*CANVAS_COUNT);
  noSmooth();
  frameRate(30);

  //ONE TIME SOCKET LISTENERS GO INTO SETUP

  //If any placeholders are added, update canvas
  socket.on('placeholderUpdate',(data) => {
    if (data) {
      //Find corresponding square to position in placeholder
      let a = squares.find(square => square.position.x == data.x && square.position.y == data.y);
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
        const x = squares.find(square => square.position.x == element.position.x && square.position.y == element.position.y)
        if (x){
          if (element.state > -1) x.srcWidth = element.state;
          x.state = element.state;
        }
      })

      moveType = Math.floor(Math.random()*5);
      //moveType = 5;
      //placeable = updatePlaceable();
      //Find corresponding square to position in data & update state based on owner of ripple tile
      data[1].forEach(element => {
        const correspondingSquare = squares.find(square => square.position.x == element.position.x && square.position.y == element.position.y);
        //Start animation
        console.log(element.state.state);
        if (element.state.state > 0){
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