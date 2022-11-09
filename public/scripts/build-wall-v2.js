p5.disableFriendlyErrors = true; // disables FES

const SQUARE_SIZE = 2;
const IMG_SIZE = 32;
const SQUARE_COUNT = 16;
const CANVAS_COUNT = 10;
const MOVING_COUNT = 20;
const TIMER_DURATION = 10;
const CLICK_DELAY = 10;
let socket;
let globalImg;
let moveChosen = null;
let placeDelay = false;
let placeCounter = 0;

class Square {
  constructor(x,y, state){
    this.position = {x: x, y: y};
    this.globalPos = {x: x, y: y};
    this.state = state;
    this.pState = state;
    this.counter = TIMER_DURATION;
    this.srcWidth = state;
    this.counterB = 100;
    this.moving = false;
    this.selected = false;
//    this.currImg = globalImg;
  }
  

  display(){
    push();
    translate(this.position.x, this.position.y);
    //image(this.currImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.counter, this.counter);
    //if (this.selected) image(,0,0,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
    image(globalImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
    if (this.selected){
      fill(0,0,255);
      ellipse(16,16,32,32);
      noFill();
    }
    pop();
  }
  
  // updateImg(){
  //   if (this.currImg === img) this.currImg = img2;
  //   else this.currImg = img;
  // }

  updateMoving(){
    this.moving = !this.moving;
  }

  updateState(){
    if(this.state == 0){
      this.state = 2;
    }
    this.state *= 2;
    if (this.state > 32) this.state = 2;
  }

  ripple(comparedState){
    if (this.state < comparedState) this.state *= 2;
    else if (this.state > comparedState) this.state /= 2;
  }

    startMoving(){
      this.moving = true;
      this.counter = 0;
    }

    update(){
      if (this.moving && this.counter < TIMER_DURATION){
        this.counter ++;
        this.srcWidth += ((this.state - this.pState)/TIMER_DURATION);
        if (this.counter >= TIMER_DURATION){
          this.moving = false;
          this.pState = this.state;
        }
      }
    }
}

let squares = []
let placeholders = []
let placeablePos = [{x:128, y:96}, {x:160, y:128}, {x:96, y:128}, {x:128, y:160}]
let occupiedCells = [];

function preload() {
 img = loadImage("assets/asset.png");
 img2 = loadImage("assets/asset2.png");
 img3 = loadImage("assets/asset3.png");
 globalImg = img;
}

function setup() {
  socket = io.connect('http://localhost:3000')
  //socket = io.connect('dandelions-iat222.herokuapp.com')
  socket.on('squareRequest',(x) => {
    x.forEach(function(square){
      if(square.position.x == 128 && square.position.y ==128){
        squares.push(new Square(128, 128, 4));
      }else{
        squares.push(new Square(square.position.x, square.position.y, 0));
      } 
    });
    //occupiedCells.push({x: 128, y:128});
  });
  createCanvas(SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT, SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT);
  noSmooth();
  frameRate(30);

  //One time listeners go into setup
  socket.on('serverRefresh',(data) => {
    if (data) {
      console.log(data); 
      // data.forEach((element) => {
      //   rippleAdjacent(element);
      // });
      if (moveChosen != null)squares.find((element) => element.position.x == moveChosen.x && element.position.y == moveChosen.y).selected = false;
      moveChosen = null;
      updateImg();
      
    }
  });

  socket.on('rippleSquares',(data) => {
    if (data) {

      data.forEach(element => {
        const centerSquare = element.state.owner;

        const correspondingSquare = squares.find(square => square.position.x == element.position.x && square.position.y == element.position.y);

        correspondingSquare.ripple(element.state.state);
        correspondingSquare.startMoving();
      })
    }
  });
}

function draw() {
  background(255);
  for (let i = 0; i < squares.length; i++){
    squares[i].display();
    squares[i].update();
  }

  if(placeDelay){
    if(placeCounter<CLICK_DELAY){
      placeCounter++;
      console.log(placeCounter);
    }else{
      placeDelay=false;
      placeCounter=0;
    }
  }
}

function mouseClicked() {
  if(!placeDelay){

    let tempSquare;
    placeablePos = updatePlaceable();
    console.log(placeablePos);

    for(let i=0; i<placeablePos.length;i++){
      if(mouseX > placeablePos[i].position.x && mouseX < placeablePos[i].position.x + 32  && mouseY > placeablePos[i].position.y && mouseY < placeablePos[i].position.y + 32){
        //tempSquare = {x: placeablePos[i].position.x, y: placeablePos[i].position.y};
        //squares.push(tempSquare);
        if(squares[i].position.x == placeablePos[i].position.x && squares[i].position.y == placeablePos[i].position.y){
          squares[i].updateState();
          console.log("tile placed");
        }
        
        //occupiedCells.push({x: tempSquare.position.x, y: tempSquare.position.y});
      }
    }
    
    //console.log(occupiedCells);

    placeDelay = true;
  }
  const active = (element) => (element.position.x < mouseX && element.position.x + IMG_SIZE > mouseX) && (element.position.y < mouseY && element.position.y + IMG_SIZE > mouseY);

  const clickedSquare = squares.find(active);
  if (clickedSquare){
    let bool = false
    if (moveChosen === null){
      bool = true;
      moveChosen = {x: clickedSquare.position.x, y: clickedSquare.position.y};
      clickedSquare.selected = true;
    } else{
      if (clickedSquare.selected){
        moveChosen = null;
        clickedSquare.selected = false;
      }
    }
  /*if (clickedSquare.moving === true) return;

    clickedSquare.updateState();
    clickedSquare.startMoving();
    //rippleAdjacent(clickedSquare);
    */
    
    socket.emit('squareUpdate',{position: clickedSquare.position, state: clickedSquare.state, selected: bool});
  }
}

const rippleAdjacent = (centerSquare) => {
  const adjacentSquares = squares.filter(square => ( (Math.abs(square.position.x-centerSquare.position.x) < IMG_SIZE*2 ) && (Math.abs(square.position.y-centerSquare.position.y) < IMG_SIZE*2) && square != centerSquare));
  
  for (let i = 0; i < adjacentSquares.length; i++){
    
    if(adjacentSquares[i].moving === true) return;
    adjacentSquares[i].ripple(centerSquare.state);
    adjacentSquares[i].startMoving();
  }
}


const updateImg = () => {
  if (globalImg === img) globalImg = img2;
  else globalImg = img;
}

function findPlaceable(square){
  let tempPlaceable = [];
  //tempPlaceable.push({x: square.position.x + 32, y: square.position.y}, {x: square.position.x - 32, y: square.position.y}, {x: square.position.x, y: square.position.y + 32}, {x: square.position.x, y: square.position.y - 32},)
  if(occupiedCells.indexOf({x: square.position.x + 32, y: square.position.y}) == -1 && placeablePos.indexOf({x: square.position.x + 32, y: square.position.y}) == -1){
    tempPlaceable.push({x: square.position.x + 32, y: square.position.y});
  }
  if(occupiedCells.indexOf({x: square.position.x - 32, y: square.position.y}) == -1 && placeablePos.indexOf({x: square.position.x + 32, y: square.position.y}) == -1){
    tempPlaceable.push({x: square.position.x - 32, y: square.position.y});
  }
  if(occupiedCells.indexOf({x: square.position.x, y: square.position.y + 32}) == -1 && placeablePos.indexOf({x: square.position.x + 32, y: square.position.y}) == -1){
    tempPlaceable.push({x: square.position.x, y: square.position.y + 32});
  }
  if(occupiedCells.indexOf({x: square.position.x, y: square.position.y- 32}) == -1 && placeablePos.indexOf({x: square.position.x + 32, y: square.position.y}) == -1){
    tempPlaceable.push({x: square.position.x, y: square.position.y - 32});
  }
  return(tempPlaceable);
}

function updatePlaceable(){
   let filteredList = squares.filter(element => element.state == 0);
   //squares.some(otherElement => (Math.abs(element.x-otherElement.x) == IMG_SIZE && otherElement.y == element.y && otherElement.state > 0)));
   console.log(filteredList);
   return(filteredList);
}
