p5.disableFriendlyErrors = true; // disables FES

//instantiate constants and global vars
const IMG_SIZE = 48;
const CANVAS_COUNT = 10;
const TIMER_DURATION = 8;

let moveChosen = null;
//let moveType = Math.floor(Math.random()*6) - 1;
let moveType;
//let placeable = [];
let placeable = new Set();

let state = 0;

let checks = [false, false, false];

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
    if (state == -1) this.srcWidth = (width/5);
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
        image(imgAlt,this.position.x * (width/5),this.position.y * (width/5),(width/5),(width/5),0,0,this.srcWidth, this.srcWidth);
        //check if current client selected tile
        if (this.selected == socket.id){
          image(client,this.position.x * (width/5),this.position.y* (width/5),(width/5),(width/5));
        } 
        //otherwise, indicate alternate socket selected tile
        else{
          image(clientAlt,this.position.x* (width/5),this.position.y* (width/5),(width/5),(width/5));
        }
      }
      //otherwise, default to black tile
      else image(img,this.position.x* (width/5),this.position.y* (width/5),(width/5),(width/5),0,0,this.srcWidth, this.srcWidth);
    } 
    
    else{
      if (this.placeable == true && moveType > -1){
        image(placeableTile,this.position.x* (width/5),this.position.y* (width/5),(width/5),(width/5));
      }
    }

    if (this.selected.length > 0){
      //check if current client selected tile
      if (this.selected == socket.id){
        image(client,this.position.x* (width/5),this.position.y* (width/5),(width/5),(width/5));
      } 
      //otherwise, indicate alternate socket selected tile
      else{
        image(clientAlt,this.position.x* (width/5),this.position.y* (width/5),(width/5),(width/5));
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

let squaresA = []
let squaresB = [];

//load all images ahead of intial paint (first draw)
function preload() {
 img = loadImage("assets/checkerW.png");
 client=loadImage("assets/client.png");
 clientAlt=loadImage("assets/client_alt.png");
 placeableTile=loadImage("assets/placeable_alt.png");
}

function setup() {
  const rand = Math.floor(Math.random() * 5);
    for (let i = 0; i < 5; i++){
        for (let j = 0; j < 5; j++){
            if (i == j && i == 2) {
              squaresA.push(new Square(i, j, Math.pow(2,2 + rand)));
              squaresB.push(new Square(i, j, Math.pow(2,2 + rand)));
            }
            else {
              squaresA.push(new Square(i, j, -1));
              squaresB.push(new Square(i, j, -1));
            }
        } 
    }
    updatePlaceable();
    moveType = (Math.floor(Math.random()*5));
  //Set up drawing conditions
  let initWidth;
  if (windowWidth < 352){
    if (windowWidth < 320) initWidth = 320;
    else initWidth = windowWidth - 32;
  }
  else if (windowWidth >= 352){
    initWidth = 320;
  }
  const p5 = createCanvas(initWidth, initWidth);
  p5.parent("canvas_container")
  p5.addClass("canvas_container__content");
  noSmooth();
  frameRate(30);

  //ONE TIME SOCKET LISTENERS GO INTO SETUP
  background(51, 48, 52);
  console.log(squaresA);

}

//Display all tiles every 0.3s
function draw() {
  background(51, 48, 52);
    if (state == 0){
        for (let i = 0; i < squaresA.length; i++){
            squaresA[i].display();
            squaresA[i].update();
        }
    }
    else if (state == 1){
        for (let i = 0; i < squaresB.length; i++){
            squaresB[i].display();
            squaresB[i].update();
        }
    }
  // squares.forEach(element => {
  //   element.display();
  //   element.update();
  // })
}

function mouseMoved() {
  if (moveType > -1 && [...placeable].some(element => (element.position.x * (width/5)) < mouseX && (element.position.x + 1) * (width/5) > mouseX && (element.position.y* (width/5)) < mouseY && (element.position.y + 1)* (width/5) > mouseY)) cursor(HAND);
  else if (moveType == -1 && squaresB.some(element => element.state > -1 && (element.position.x * (width/5)) < mouseX && (element.position.x + 1) * (width/5) > mouseX && (element.position.y* (width/5)) < mouseY && (element.position.y + 1)* (width/5) > mouseY)) cursor(HAND);
  else cursor(ARROW)
}

//Click callback
function mousePressed(event) {
//   console.log(event)
//   console.log("MOUSEDEBUG")
//   console.log(mouseX);
//   console.log(mouseY);
  //Find tile that was clicked
  const active = (element) => (element.position.x * (width/5) < mouseX && (element.position.x+1)* (width/5) > mouseX) && ((element.position.y)* (width/5) < mouseY && (element.position.y+1) * (width/5) > mouseY);
  
  let clickedSquare;
  if(state == 0) clickedSquare = squaresA.find(active);
  else clickedSquare = squaresB.find(active);
  console.log(clickedSquare);

  if((moveType > -1 && placeable.has(clickedSquare)) || (moveType == -1 && clickedSquare.state > -1)){
      switch (state){
        case 0: 
        let tempMoveType = moveType;
        if (moveType > -1) tempMoveType = Math.pow(2,2 + tempMoveType);      
        clickedSquare.srcWidth = tempMoveType;
        clickedSquare.state = tempMoveType;
        rippleAdjacent(clickedSquare);
        for (let i = 0; i < squaresA.length; i++){
          squaresB[i].state = squaresA[i].state;
          squaresB[i].srcWidth = squaresA[i].srcWidth;
        }
        moveType = (Math.floor(Math.random()*5));
        break;

        case 1:
        clickedSquare.state = moveType;
        clickedSquare.srcWidth = width/5;
        moveType = -1;
        break;

      }
      updatePlaceable();
      let counterA = 0;
      let counterB = 0;
      for (let i = 0; i < squaresA.length; i++){
        if (squaresA[i].state > -1) counterA ++;
      }
      for (let i = 0; i < squaresB.length; i++){
        if (squaresB[i].state > -1) counterB ++;
      }

      if (counterA >= 25 && state == 0) {
        state = 1;
        moveType = -1;
      }
      if (counterB == 0 && state == 1){
        state = 2;
      }
    }
}

function windowResized() {
  if (windowWidth >= 320 && windowWidth < 352){
    resizeCanvas(windowWidth-32, windowWidth-32);
  }
  else if (windowWidth >= 352){
    resizeCanvas(320, 320);
  }
  //resizeCanvas(windowWidth, windowHeight);
}

//Ripple command based on central square (defunct)
const rippleAdjacent = (centerSquare) => {
  const adjacentSquares = squaresA.filter(square => ( (Math.abs(square.position.x-centerSquare.position.x) < 2 ) && (Math.abs(square.position.y-centerSquare.position.y) < 2) && square != centerSquare));
  
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
  placeable.clear();
  for (let i = 0; i < squaresA.length; i++){
    squaresA[i].placeable = false;
    if(squaresA[i].state == -1 && (squaresA.some(otherElement => (Math.abs(squaresA[i].position.x-otherElement.position.x) == 1 && otherElement.position.y == squaresA[i].position.y && otherElement.state > -1)) ||
    squaresA.some(otherElement => (Math.abs(squaresA[i].position.y-otherElement.position.y) == 1 && otherElement.position.x == squaresA[i].position.x && otherElement.state > -1)))){
      placeable.add(squaresA[i]);
      squaresA[i].placeable = true;
    }
  }
	//return(filteredList);
}


const updateToggle = () => {
  const toggle = document.querySelector('.client__menu__toggle');
  const wrapper = document.querySelector('.client__menu__wrapper');
  if (toggle.classList.contains("client__menu__toggle--active")) {
    toggle.classList.remove("client__menu__toggle--active");
    wrapper.classList.remove("client__menu__wrapper--active");
  }
  else {
    toggle.classList.add("client__menu__toggle--active");
    wrapper.classList.add("client__menu__wrapper--active");
  }
}

const updateMenu = (action) => {
  let activeMenu;
  const toggle = document.querySelector('.client__menu__toggle');
  const wrapper = document.querySelector('.client__menu__wrapper');
  if (action == 'edit'){
    activeMenu = document.querySelector('.client__menu__modify');
    activeMenu.classList.add("client__menu__modify--active");
    document.querySelector('.client__menu__move').classList.remove("client__menu__move--active");
  } else{
    activeMenu = document.querySelector('.client__menu__move');
    activeMenu.classList.add("client__menu__move--active");
    document.querySelector('.client__menu__modify').classList.remove("client__menu__modify--active");
  }
  toggle.classList.remove("client__menu__toggle--active");
  wrapper.classList.remove("client__menu__wrapper--active");
}

const migrate = () => {
  socket.emit('migrate', true);
}

const setState = (stateInput) => {
  state = stateInput;
}

const resetBuild = () => {
  for (let i = 0; i < squaresA.length; i++){
    if (i == 12){
      const x = Math.pow(2, 2+ Math.floor(Math.random()*5))
      squaresB[i].state = x;
      squaresB[i].srcWidth = x;

      squaresA[i].state = x;
      squaresA[i].srcWidth = x;
    }
    else {
      squaresB[i].state = -1;
      squaresB[i].srcWidth = -1;

      squaresA[i].state = -1;
      squaresA[i].srcWidth = -1;
    }
  }
  updatePlaceable();
  state = 0;
  moveType = Math.floor(Math.random()*5);
}

const resetErase = () => {
  for (let i = 0; i < squaresA.length; i++){
    if (squaresB[i].state == -1){
      const x = Math.pow(2, 2+ Math.floor(Math.random()*5))
      squaresB[i].state = x;
      squaresB[i].srcWidth = x;

      squaresA[i].state = x;
      squaresA[i].srcWidth = x;
    }
  }

  state = 1;
  moveType = -1;
}

const backState = () => {
  state--;
  if (state == 0) {
    resetBuild();
  }
  else{
    
  }

}

const nextState = () => {
  state++;
  if (state == 1) {
    resetErase();
  }
  else{

  }

}