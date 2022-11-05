p5.disableFriendlyErrors = true; // disables FES

const SQUARE_SIZE = 2;
const IMG_SIZE = 32;
const SQUARE_COUNT = 16;
const CANVAS_COUNT = 100;
const MOVING_COUNT = 20;
const TIMER_DURATION = 10;
let socket;
let globalImg;

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
//    this.currImg = globalImg;
  }
  

  display(){
    push();
    translate(this.position.x, this.position.y);
    //image(this.currImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.counter, this.counter);
    image(globalImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
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

function preload() {
 img = loadImage("assets/asset.png");
 img2 = loadImage("assets/asset2.png");
 img3 = loadImage("assets/asset3.png");
 globalImg = img;
}

function setup() {
  //socket = io.connect('http://localhost:3000')
  socket = io.connect('dandelions-iat222.herokuapp.com')
  socket.on('squareRequest',(x) => {
    x.forEach(function(square){
      squares.push(new Square(square.position.x, square.position.y, Math.pow(2,1 + square.state)));
    });
    // for (let i = 0; i < CANVAS_COUNT; i++){
    //   for (let j = 0; j < CANVAS_COUNT; j++){
    //   squares.push(new Square(x[],j * SQUARE_SIZE*SQUARE_COUNT, i<MOVING_COUNT && j < MOVING_COUNT));
    //   }
    // }
  });
  createCanvas(SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT, SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT);
  noSmooth();
  frameRate(30);

  //One time listeners go into setup
  socket.on('serverRefresh',(data) => {
    if (data) {
      console.log(data); 
      data.forEach((element) => {
        rippleAdjacent(element);
      });
      updateImg();
      
    }
  });
}

function draw() {
  background(255);
  for (let i = 0; i < squares.length; i++){
    squares[i].display();
    squares[i].update();
  }

  // socket.on('serverRefresh',(data) => {
  //   //console.log("did a 180");
  //   if (data) {
  //     console.log(data); 
  //     updateImg();
  //   }
  //   //squares.forEach((arrayItem) => arrayItem.updateImg());
  // });
}

function mouseClicked() {
  const active = (element) => (element.position.x < mouseX && element.position.x + IMG_SIZE > mouseX) && (element.position.y < mouseY && element.position.y + IMG_SIZE > mouseY);

  //console.log(squares.find(active));
  const clickedSquare = squares.find(active);
  if (clickedSquare){
  if (clickedSquare.moving === true) return;
    //clickedSquare.updateImg();
    clickedSquare.updateState();
    clickedSquare.startMoving();
    // clickedSquare.updateMoving();
    //rippleAdjacent(clickedSquare);
    //console.log(adjacentSquares);
    socket.emit('squareUpdate',{position: clickedSquare.position, state: clickedSquare.state});
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

