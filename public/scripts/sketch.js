p5.disableFriendlyErrors = true; // disables FES

const SQUARE_SIZE = 2;
const IMG_SIZE = 32;
const SQUARE_COUNT = 16;
const CANVAS_COUNT = 100;
const MOVING_COUNT = 20;
const TIMER_DURATION = 10;
let socket;
let id;
let globalImg;
let moveChosen = null;

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
    this.selected = "";
    this.selectedID = "";
//    this.currImg = globalImg;
  }
  

  display(){
    push();
    translate(this.position.x, this.position.y);
    //image(this.currImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.counter, this.counter);
    //if (this.selected) image(,0,0,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
    image(globalImg,0,0,IMG_SIZE,IMG_SIZE,0,0,this.srcWidth, this.srcWidth);
    smooth();
    if (this.selected == id){
      fill(0,0,255);
      ellipse(16,16,20,20);
      noFill();
    } else if (this.selected.length > 0){
      stroke(0);
      strokeWeight(2);
      fill(255);
      ellipse(16,16,20,20);
      noFill();
      noStroke();
    }
    noSmooth();
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
let placeholders = []

function preload() {
 img = loadImage("assets/asset.png");
 img2 = loadImage("assets/asset2.png");
 img3 = loadImage("assets/asset3.png");
 globalImg = img;
}

function setup() {
  //socket = io.connect('http://localhost:3000')
  socket = io.connect('dandelions-iat222.herokuapp.com')

  //establish ID
  socket.on('connect', function() {
    const sessionID = socket.id; 
    id = sessionID;
    console.log(id);
  });

  socket.on('squareRequest',(x) => {
    x.forEach(function(square){
      squares.push(new Square(square.position.x, square.position.y, Math.pow(2,1 + square.state)));
    });

  });

  socket.on('pRequest',(data) => {
      let a = squares.find(square => square.position.x == data.x && square.position.y == data.y);
      console.log(a);
      if (a){
        if (data.onCanvas == true){
          console.log(true)
          a.selected = data.id;
        } else {
          console.log(false)
          a.selected = "";
        }
        console.log(a.selected);
      }

  });
  createCanvas(SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT, SQUARE_SIZE*SQUARE_COUNT*CANVAS_COUNT);
  noSmooth();
  frameRate(30);

  //One time listeners go into setup
  socket.on('placeholderUpdate',(data) => {
    if (data) {
      console.log("Data received:");
      // console.log(data.x); 
      // console.log(squares[0].position.x); 
      // console.log(squares[0].position.x == data.x && squares[0].position.y == data.y); 
      // let x = data.x;
      // let y = data.y;
      // console.log(squares[0].position.x == x); 
      //const a = squares.find(element => {element.position.x == data.x && element.position.y == data.y});
      let a = squares.find(square => square.position.x == data.x && square.position.y == data.y);
      console.log(a);
      if (a){
        if (data.onCanvas == true){
          console.log(true)
          a.selected = data.id;
        } else {
          console.log(false)
          a.selected = "";
        }
        console.log(a.selected);
      }
    }
  });

  socket.on('serverRefresh',(data) => {
    if (data) {
      //console.log(data); 
      // data.forEach((element) => {
      //   rippleAdjacent(element);
      // });
      if (moveChosen != null)squares.find((element) => element.position.x == moveChosen.x && element.position.y == moveChosen.y).selected = false;
      moveChosen = null;
      placeholders = [];
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
}

function mouseClicked() {
  const active = (element) => (element.position.x < mouseX && element.position.x + IMG_SIZE > mouseX) && (element.position.y < mouseY && element.position.y + IMG_SIZE > mouseY);

  const clickedSquare = squares.find(active);
  if (clickedSquare){
    let bool = false
    if (moveChosen === null){
      bool = true;
      moveChosen = {x: clickedSquare.position.x, y: clickedSquare.position.y};
      //clickedSquare.selected = id;
    } else{
      if (clickedSquare.selected){
        moveChosen = null;
        //clickedSquare.selected = "";
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

