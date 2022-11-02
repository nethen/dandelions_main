p5.disableFriendlyErrors = true; // disables FES

const SQUARE_SIZE = 2;
const IMG_SIZE = 32;
const SQUARE_COUNT = 16;
const CANVAS_COUNT = 100;
const MOVING_COUNT = 20;
const TIMER_DURATION = 10;
let socket;

class Square {
  constructor(x,y, state){
    this.position = {x: x, y: y};
    this.globalPos = {x: x, y: y};
    this.state = state;
    this.pState = state;
    this.counter = TIMER_DURATION;
    this.srcWidth = state;
    if (this.counter === 32){
      this.maxCounter = 32;
    } else{
      this.maxCounter = this.counter * 2;
    }

    if (this.counter === 2){
      this.minCounter = 2;
    } else{
      this.minCounter = this.counter / 2;
    }
    this.counterB = 100;
    this.adder = 1;
    // this.moving = bool;
    this.active = false;
    this.currImg = img;
  }
  

  display(){
    push();
    translate(this.position.x, this.position.y);
    //image(this.currImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.counter, this.counter);
    image(this.currImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
    pop();
  }
  
  updateImg(){
    if (this.currImg === img) this.currImg = img2;
    else this.currImg = img;
  }

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

  // update(){
  //   if (this.moving == true){
  //     if (this.counter < this.minCounter || this.counter > this.maxCounter){
  //       this.adder *= -1;
  //       this.counter += this.adder;

  //     } else{
  //       //if (this.counterB == 90) this.counterB = 0;
  //       this.counter += this.adder;
  //       }
  //   }
  // }
    startMoving(){
      this.moving = true;
      this.counter = 0;
    }

    update(){
      if (this.moving && this.counter < TIMER_DURATION){
        // if (this.counter < 60){
        //   this.counter ++;
        //   //console.log(this.counter);
        //   this.srcWidth += ((this.state - this.pState)/60);
        // }
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
}

function setup() {
  socket = io.connect('http://localhost:3000')
  //socket = io.connect('dandelions-iat222.herokuapp.com')
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
}

function draw() {
  background(255);
  for (let i = 0; i < squares.length; i++){
    squares[i].display();
    squares[i].update();
  }
}

function mouseClicked() {
  const active = (element) => (element.position.x < mouseX && element.position.x + IMG_SIZE > mouseX) && (element.position.y < mouseY && element.position.y + IMG_SIZE > mouseY);

  //console.log(squares.find(active));
  const clickedSquare = squares.find(active);
  if (clickedSquare.moving === true) return;
  clickedSquare.updateImg();
  clickedSquare.updateState();
  clickedSquare.startMoving();
  // clickedSquare.updateMoving();
  const adjacentSquares = squares.filter(square => ( (Math.abs(square.position.x-clickedSquare.position.x) < IMG_SIZE*2 ) && (Math.abs(square.position.y-clickedSquare.position.y) < IMG_SIZE*2) && square != clickedSquare));
  
  for (let i = 0; i < adjacentSquares.length; i++){
    
    if(adjacentSquares[i].moving === true) return;
    adjacentSquares[i].ripple(clickedSquare.state);
    adjacentSquares[i].startMoving();
  }

  //console.log(adjacentSquares);
  socket.emit('squareUpdate',clickedSquare.state);
}