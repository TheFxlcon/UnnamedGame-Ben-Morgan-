//setup canvas
let canvas = document.getElementById("canvas");
canvas.style.backgroundColor = "#aaaaaa";
let ctx = canvas.getContext("2d");

//define images
let imgSpeed = document.getElementById("imgSpeed");
let imgCheckpoint = document.getElementById("imgCheckpoint");
let imgCoin = document.getElementById("imgCoin");
let imgJump = document.getElementById("imgJump");
let imgTeleport = document.getElementById("imgTeleport");

//init variables
let debugging = false;
let running = false;
let paused = true;
let mouseX, mouseY;
let frames = 0;

let lerp = 0;
let lerpSpeed = 2;
let maxCamPos = 50;

const timeStep = 0.01;
const gravity = -9.81;

function drawCircle(x,y,r) {
	ctx.beginPath();
	ctx.arc(canvas.width/2+(x-camera.x), canvas.height/2-(y-camera.y), r, 0, 2*Math.PI);
    ctx.lineWidth = 1.5;
    ctx.stroke();
}
function drawLine(x1,y1,x2,y2) {
	ctx.beginPath();
	ctx.moveTo(canvas.width/2+(x1-camera.x), canvas.height/2-(y1-camera.y));
	ctx.lineTo(canvas.width/2+(x2-camera.x), canvas.height/2-(y2-camera.y));
    ctx.lineWidth = 1.5;
    ctx.stroke();
}
function textToScreen(text,x,y,s,c) {
    ctx.font = s + "px Arial";
    ctx.fillStyle = (c == undefined) ? "black" : c;
    ctx.fillText(text,x,y);
}
function textToGame(text,x,y,s) {
    ctx.font = s + "px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(text,canvas.width/2+(x-camera.x),canvas.height/2-(y-camera.y));
}
function fillRectangle(x,y,w,h,c) {
    ctx.beginPath();
    ctx.rect(canvas.width/2+(x-camera.x),canvas.height/2-(y-camera.y),w,h);
    ctx.fillStyle = c;
    ctx.fill();
}
function fillRectangleScr(x,y,w,h,c) {
    ctx.beginPath();
    ctx.rect(x,y,w,h);
    ctx.fillStyle = c;
    ctx.fill();
}
function drawImg(img,x,y,w,h) {
    ctx.drawImage(img,canvas.width/2+(x-camera.x),canvas.height/2-(y-camera.y),w,h);
}

class vector {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }
    log() {
        alert(this.x + " " + this.y);
    }
    mag() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }
    norm() {
        return new vector(this.x/this.mag(),this.y/this.mag());
    }
}
class Player {
    constructor(x,y,w,h) {
        this.mesh = [new vector(x-w/2,y+h/2),new vector(x+w/2,y+h/2),new vector(x+w/2,y-h/2),new vector(x-w/2,y-h/2)];
        this.centre = new vector(x,y);
        this.startPos = new vector(x,y);
        this.width = w, this.height = h;
        this.colour = "#000000";

        this.force = new vector(0,gravity*100);
        this.velocity = new vector(0,0);
        this.direction = 0;
        this.baseSpeed = 150;
        this.speed = 150;
        this.jumpHeight = 1;
        this.isGrounded = false;
        this.spawnPoint = this.centre;

        this.coinCount = 0;
        this.abilities = [];
    }
    draw() {
        for (let p1=0; p1<this.mesh.length; p1++) {
            let p2 = (p1 == this.mesh.length-1) ? 0 : p1+1;
            drawLine(this.mesh[p1].x,this.mesh[p1].y,this.mesh[p2].x,this.mesh[p2].y);
        }
        fillRectangle(this.mesh[0].x,this.mesh[0].y,this.width,this.height,this.colour);
        textToScreen("Coins: " + this.coinCount,10,canvas.height-25,25);
    }
    translate(x,y) {
        this.centre = new vector(this.centre.x+x, this.centre.y+y);
        for (let i=0; i<this.mesh.length; i++) {
            this.mesh[i] = new vector(this.mesh[i].x+x, this.mesh[i].y+y);
        }
    }
    addForce(x,y) {
        this.force.x += x*100;
        this.force.y += y*100;
    }
    updateMesh() {
        player.mesh = [
            new vector(player.centre.x-player.width/2,player.centre.y+player.height/2),
            new vector(player.centre.x+player.width/2,player.centre.y+player.height/2),
            new vector(player.centre.x+player.width/2,player.centre.y-player.height/2),
            new vector(player.centre.x-player.width/2,player.centre.y-player.height/2)
        ];
    }
    updateVelocity() {
        this.velocity.x = this.speed*this.direction;
        this.velocity.y += this.force.y*timeStep;
        this.velocity.y = Math.max(Math.min(this.velocity.y,1000),-1000);
        this.force = new vector(0,gravity*100);
    }
    updatePosition() {
        let x = this.velocity.x*timeStep;
        let y = this.velocity.y*timeStep;
        this.translate(x,y);
    }
    checkIfGrounded(a) {
        let dist = new vector(this.centre.x-a.centre.x, this.centre.y-a.centre.y);
        let x = (a.width+this.width)/2;
        let y = (a.height+this.height)/2;
        let overlap = new vector(0,0);
        if (-x <= dist.x && dist.x <= x && -y <= dist.y && dist.y <= y) {
            overlap.x = (dist.x < 0) ? -x-dist.x : x-dist.x;
            overlap.y = (dist.y < 0) ? -y-dist.y : y-dist.y;
            if (overlap.y*overlap.y <= overlap.x*overlap.x) {
                this.translate(0,overlap.y);
                if ((this.velocity.y < 0 && dist.y > 0) || (dist.y < 0 && this.velocity.y > 0)) {
                    this.velocity.y = 0;
                }
                if (dist.y > 0 && this.velocity.y <= 0) {
                    this.force.y = 0;
                    return true;
                }
            } else {
                this.translate(overlap.x,0);
            }
        }
        return false;
    }
    updateAbilities() {
        this.speed = this.baseSpeed;
        this.jumpHeight = 1;
        for (let i=this.abilities.length-1; i>=0; i--) {
            if (this.abilities[i][1] > 0) {
                this.abilities[i][1]--;
                if (this.abilities[i][0] == "speed") {
                    this.speed *= 1.5;
                } else if (this.abilities[i][0] == "jump") {
                    this.jumpHeight *= 1.5;
                }
            } else {
                this.abilities.splice(i,1);
            }
        }
    }
    reset() {
        let distx = this.startPos.x-this.centre.x;
        let disty = this.startPos.y-this.centre.y;
        this.translate(distx,disty);
        this.spawnPoint = this.startPos;
        this.velocity = new vector(0,0);
        this.coinCount = 0;
        this.abilities = [];
    }
}
class Object {
    constructor(x,y,w,h,tag,solid) {
        this.mesh = [new vector(x-w/2,y+h/2),new vector(x+w/2,y+h/2),new vector(x+w/2,y-h/2),new vector(x-w/2,y-h/2)];
        this.centre = new vector(x,y);
        this.startPos = new vector(x,y);
        this.width = w;
        this.height = h;
        this.colour = "#000000";
        this.filled = true;
        this.tag = tag;
        this.solid = (solid == undefined) ? true : solid;
        this.solidStart = this.solid;
    }
    draw() {
        switch(this.tag) {
            case "checkpoint": 
                drawImg(imgCheckpoint,this.mesh[0].x,this.mesh[0].y,this.width*20/3,this.height);
                break;
            case "jump":
                drawImg(imgJump,this.mesh[0].x,this.mesh[0].y,this.width,this.height);
                break;
            case "teleport":
                drawImg(imgTeleport,this.mesh[0].x,this.mesh[0].y,this.width,this.height);
                break;
            default: 
                for (let p1=0; p1<this.mesh.length; p1++) {
                    let p2 = (p1 == this.mesh.length-1) ? 0 : p1+1;
                    drawLine(this.mesh[p1].x,this.mesh[p1].y,this.mesh[p2].x,this.mesh[p2].y);
                }
                if (this.filled) {
                    fillRectangle(this.mesh[0].x,this.mesh[0].y,this.width,this.height,this.colour);
                }
                break;
        }
    }
    translate(x,y) {
        this.centre = new vector(this.centre.x+x, this.centre.y+y);
        for (let i=0; i<this.mesh.length; i++) {
            this.mesh[i] = new vector(this.mesh[i].x+x, this.mesh[i].y+y);
        }
    }
}
class Collectable {
    constructor(x,y,w,h,solid,tag,duration) {
        this.mesh = [new vector(x-w/2,y+h/2),new vector(x+w/2,y+h/2),new vector(x+w/2,y-h/2),new vector(x-w/2,y-h/2)];
        this.centre = new vector(x,y);
        this.width = w;
        this.height = h;
        this.tag = tag;
        this.duration = duration;
        this.filled = false;
        this.colour = "#000000";
        this.solid = (solid == undefined) ? true : solid;
        this.solidStart = this.solid;
        this.active = true;
    }
    draw() {
        if (this.tag == "speed" && this.solid) {
            drawImg(imgSpeed,this.mesh[0].x,this.mesh[0].y,this.width,this.height);
        } else if (this.tag == "coin" && this.solid) {
            drawImg(imgCoin,this.mesh[0].x,this.mesh[0].y,this.width,this.height);
        } else {
            if (this.solid) {
                for (let p1=0; p1<this.mesh.length; p1++) {
                    let p2 = (p1 == this.mesh.length-1) ? 0 : p1+1;
                    drawLine(this.mesh[p1].x,this.mesh[p1].y,this.mesh[p2].x,this.mesh[p2].y);
                }
                if (this.filled) {
                    fillRectangle(this.mesh[0].x,this.mesh[0].y,this.width,this.height,this.colour);
                }
                textToGame(this.tag,this.centre.x-this.width/2+1,this.centre.y-this.width/4+2,20);
            }
        }
    }
    reset() {
        this.solid = this.solidStart;
    }
}

function colliding(a,b) {
    let dist = new vector(b.centre.x-a.centre.x, b.centre.y-a.centre.y);
    let x = (a.width+b.width)/2;
    let y = (a.height+b.height)/2;
    if (-x <= dist.x && dist.x <= x && -y <= dist.y && dist.y <= y) {
        return true;
    }
    return false;
}
function resolveCollisions(a,b) {
    let dist = new vector(b.centre.x-a.centre.x, b.centre.y-a.centre.y);
    let x = (a.width+b.width)/2;
    let y = (a.height+b.height)/2;
    let overlap = new vector(0,0);
    if (-x <= dist.x && dist.x <= x && -y <= dist.y && dist.y <= y) {
        overlap.x = (dist.x < 0) ? -x-dist.x : x-dist.x;
        overlap.y = (dist.y < 0) ? -y-dist.y : y-dist.y;
        if (overlap.y*overlap.y <= overlap.x*overlap.x) {
            b.translate(0,overlap.y);
            b.velocity.y = 0;
            if (dist.y > 0) {
                b.force.y = 0;
            }
        } else {
            b.translate(overlap.x,0);
        }
    }
}
function sceneReset(scene) {
    player.reset();
    for (let i=0; i<scenes[scene].collectables.length; i++) {
        scenes[scene].collectables[i].reset();
    }
}

//button positions
let buttons = {
    levels : [
        new vector(canvas.width/2-200,canvas.height/2-100),
        new vector(canvas.width/2+200,canvas.height/2-100),
        new vector(canvas.width/2-200,canvas.height/2+100),
        new vector(canvas.width/2+200,canvas.height/2+100)
    ],
    menu : new vector(canvas.width/2-594,canvas.height/2-274),
    reset : new vector(canvas.width/2-543,canvas.height/2-274)
};

//init scenes
let scene1 = {
    statics : [
        new Object(0,-270,1000,30), //ground
        new Object(-100,0,200,30), //ground
        new Object(50,-150,100,30), //ground
        new Object(150,-50,100,30), //ground
        new Object(700,0,100,30), //ground
        new Object(375,-230,4,50,"checkpoint",false), //checkpoint
        new Object(450,-250,100,10,"jump"), //bounce pad
        new Object(-150,20,50,10,"teleport"), //teleporter
        new Object(700,20,50,10,"teleport") //teleporter
    ],
    collectables : [
        new Collectable(-200,100,40,40,true,"coin"), //coin
        new Collectable(-250,100,40,40,true,"coin"), //coin
        new Collectable(-225,-200,40,40,true,"speed",500) //speed
    ]
};
let scene2 = {
    statics : [
        new Object(0,-270,1000,30), //ground
    ],
    collectables : [

    ]
}

let scenes = [scene1];
let scene = 0;

let player = new Player(-450,-200,40,40);
let camera = new vector(player.centre.x,-50);
let fallDetector = -400;

function Update() {
    if (running && !paused) {
        frames++;
        ctx.clearRect(0,0,canvas.width,canvas.height);

        //update player position and movement
        player.updateVelocity();
        player.updatePosition();

        //check collisions with static objects
        for (let i=0, grounded=false; i<scenes[scene].statics.length; i++) {
            if (!scenes[scene].statics[i].solid) {
                if (colliding(player,scenes[scene].statics[i]) && scenes[scene].statics[i].tag == "checkpoint") {
                    player.spawnPoint = scenes[scene].statics[i].centre;
                }
                i++;
            }
            if (player.checkIfGrounded(scenes[scene].statics[i])) {
                if (scenes[scene].statics[i].tag == "jump") {
                    player.abilities.push(["jump",1]);
                } else if (scenes[scene].statics[i].tag == "teleport") {
                    for (let j=0; j<scenes[scene].statics.length; j++) {
                        if (scenes[scene].statics[j].tag == "teleport" && i != j) {
                            let enabled = true;
                            for (let k=0; k<player.abilities.length; k++) {
                                if (player.abilities[k][0] == "teleport") {
                                    enabled = false;
                                }
                            }
                            if (enabled) {
                                ctx.clearRect(0,0,canvas.width,canvas.height);
                                let t2t = new vector(scenes[scene].statics[j].centre.x-scenes[scene].statics[i].centre.x, scenes[scene].statics[j].centre.y-scenes[scene].statics[i].centre.y);
                                player.translate(t2t.x,t2t.y);
                                player.abilities.push(["teleport",200]);
                                running = false;
                                setTimeout(() => {running = true;}, 100);
                            }
                            break;
                        }
                    }
                }
                grounded = true;
            }
            player.isGrounded = (i==scenes[scene].statics.length-1) ? grounded : player.isGrounded;
        }

        //checks for collisions with collectable items
        for (let i=0; i<scenes[scene].collectables.length; i++) {
            if (scenes[scene].collectables[i].solid && colliding(player, scenes[scene].collectables[i])) {
                if (scenes[scene].collectables[i].tag == "coin") {
                    player.coinCount++;
                } else if (scenes[scene].collectables[i].duration != undefined) {
                    player.abilities.push([scenes[scene].collectables[i].tag,scenes[scene].collectables[i].duration]);
                }
                scenes[scene].collectables[i].solid = false;
            }
        }
        //update player abilities and respawn if necessary
        player.updateAbilities();
        if (player.centre.y-player.height/2 < fallDetector) {
            player.translate(player.spawnPoint.x-player.centre.x,player.spawnPoint.y-player.centre.y);
        }

        //update cam position
        lerp = Math.max(Math.min(lerp,maxCamPos),-maxCamPos);
        if (player.velocity.x != 0) {
            lerp += (player.velocity.x > 0) ? lerpSpeed : -lerpSpeed;
            camera.x = player.centre.x+lerp;
        } else  if (player.velocity.x == 0 && player.centre.x != camera.x){
            lerp += (camera.x < player.centre.x) ? lerpSpeed : -lerpSpeed;
            camera.x = 
            player.centre.x+lerp;
        }
    }

    if (running && !paused) {
        //draw the objects
        for (let i=0; i<scenes[scene].statics.length; i++) {
            scenes[scene].statics[i].draw();
        }
        for (let i=0; i<scenes[scene].collectables.length; i++) {
            scenes[scene].collectables[i].draw();
        }
        player.draw();

        //debugging info
        if (debugging && !paused) {
            ctx.beginPath();
            ctx.rect(1,1,canvas.width-2,38);
            ctx.fillStyle = "black";
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.fillText("Frames: " + frames,10,25);
            ctx.fillText("Time: " + Math.round(frames*timeStep*100)/100,150,25);
            ctx.fillText(Math.round((mouseX)-canvas.width/2+camera.x) + " " + Math.round(canvas.height/2-(mouseY-camera.y)),mouseX,mouseY);
        }
    }

    if (paused) {
        if (running) {
            //paused screen
            textToScreen("PAUSED",canvas.width/2-250,canvas.height/2,150);
            fillRectangleScr(buttons.menu.x-25,buttons.menu.y-25,50,50,"#000000");
            textToScreen("Menu",buttons.menu.x-23,buttons.menu.y+8,18,"#ffffff");
            fillRectangleScr(buttons.reset.x-25,buttons.reset.y-25,50,50,"#000000");
            textToScreen("Reset",buttons.reset.x-24,buttons.reset.y+8,18,"#ffffff");
        } else {
            //menu screen
            textToScreen("MENU",canvas.width/2-150,canvas.height/2-200,100);
            for (let i=0; i<buttons.levels.length; i++) {
                let c = (i<scenes.length) ? "#777777" : "#000000";
                fillRectangleScr(buttons.levels[i].x-100,buttons.levels[i].y,200,70,c);
                textToScreen("Level "+(i+1),buttons.levels[i].x-90,buttons.levels[i].y+50,50);
            }
        }
    }
}

function Start() {
    let keysDown = [false,false];

    //detecting key presses
    document.addEventListener("keydown", function(event) {
		if (event.key == "w" && player.isGrounded && !paused && running) {
            player.addForce(0,500*player.jumpHeight);
		} else if (event.key == "d") {
            keysDown[0] = true;
            player.direction = 1;
        } else if (event.key == "a") {
            keysDown[1] = true;
            player.direction = -1;
        } else if (event.key == "s") {
            player.height = 20;
            player.updateMesh();
            if (player.isGrounded) {
                player.translate(0,-10);
            }
        } else if (event.key == "0") {
            debugging = !debugging;
        } else if (event.key == "Escape") {
            if (running) {
                paused = !paused;
            }
    
            //HAHA YOU'RE GAY

        // } else if (event.key == "Backspace") {
        //     sceneReset(scene);
        // } else if (event.key >= 1 && event.key <= scenes.length) {
        //     scene = event.key-1;
        //     player.reset();
        }
    });

    //detecting key releases
	document.addEventListener("keyup", function(event) {
		if (event.key == "d") {
            keysDown[0] = false;
        } else if (event.key == "a") {
            keysDown[1] = false;
        } else if (event.key == "s") {
            player.height = 40;
            player.updateMesh();
            player.translate(0,10);
            if (player.isGrounded) {
                player.addForce(0,750*player.jumpHeight);
            }
        }
        if (!keysDown[0] && !keysDown[1]) {
            player.direction = 0;
        }
    });

    //update mouse position
    canvas.addEventListener("mousemove", function(event) {
		mouseX = event.offsetX;
		mouseY = event.offsetY;
    });

    //detect mouse click
    canvas.addEventListener("click", function(event) {
		mouseX = event.offsetX;
        mouseY = event.offsetY;

        //menu screen
        if (!running && paused) {
            for (let i=0; i<buttons.levels.length; i++) {
                if (buttons.levels[i].x-100 <= mouseX && mouseX <= buttons.levels[i].x+100) {
                    if (buttons.levels[i].y <= mouseY && mouseY <= buttons.levels[i].y+70) {
                        if (i < scenes.length) {
                            scene = i;
                            running = true;
                            paused = false;
                        }
                        break;
                    }
                }
            }
        }
        //pause screen
        if (running && paused) {
            if (buttons.menu.x-25 <= mouseX && mouseX <= buttons.menu.x+25) {
                if (buttons.menu.y-25 <= mouseY && mouseY <= buttons.menu.y+25) {
                    ctx.clearRect(0,0,canvas.width,canvas.height);
                    running = false;
                }
            } else if (buttons.reset.x-25 <= mouseX && mouseX <= buttons.reset.x+25) {
                if (buttons.reset.y-25 <= mouseY && mouseY <= buttons.reset.y+25) {
                    sceneReset(scene);
                    paused = false;
                }
            }
        }
    });
    
    //game loop
    setInterval(Update,timeStep*1000);
}