p5.disableFriendlyErrors = true; // disables FES

const SQUARE_SIZE = 2;
const SQUARE_COUNT = 16;
const CANVAS_COUNT = 100;
const MOVING_COUNT = 20;
let timeFreeze = true;
let socket;

class Square {
  constructor(x,y, bool){
    this.x = x;
    this.y = y;
    this.randomSize = random();
    if (this.randomSize < 0.3) {
      this.counter = SQUARE_SIZE;
      this.minCounter = SQUARE_SIZE;
      this.maxCounter = SQUARE_SIZE * 4;
    }
    else if (this.randomSize < 0.6){
      this.counter = SQUARE_SIZE*2;
      this.minCounter = SQUARE_SIZE*2;
      this.maxCounter = SQUARE_SIZE * 8;
    }
    else{
      this.counter = SQUARE_SIZE*4;
      this.minCounter = SQUARE_SIZE*4;
      this.maxCounter = SQUARE_SIZE * SQUARE_COUNT;
    } 
    this.counterB = 100;
    this.adder = 1;
    this.moving = bool;
  }
  
  display(){
    push();
    translate(this.x, this.y);
    image(img,0,0,SQUARE_SIZE*SQUARE_COUNT,SQUARE_SIZE*SQUARE_COUNT,0,0,this.counter, this.counter)

    pop();
  }
  
  update(){
    if (this.moving == true && timeFreeze){
      if (this.counter < this.minCounter || this.counter > this.maxCounter){
        this.adder *= -1;
        this.counter += this.adder;

      } else{
        //if (this.counterB == 90) this.counterB = 0;
        this.counter += this.adder;
        }
    }
  }
}

let squares = []

function preload() {
 img = loadImage("assets/asset.png");
}

function setup() {
  socket = io.connect('http://localhost:3000')

  createCanvas(SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT, SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT);
  for (let i = 0; i < CANVAS_COUNT; i++){
    for (let j = 0; j < CANVAS_COUNT; j++){
    squares.push(new Square(i * SQUARE_SIZE*SQUARE_COUNT,j * SQUARE_SIZE*SQUARE_COUNT, i<MOVING_COUNT && j < MOVING_COUNT));
    }
  }
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
  timeFreeze = !timeFreeze;
}