var canvas = document.getElementById("canvas");
canvas.width = 1345;
canvas.height = 90;
var c = canvas.getContext("2d");
var numStars = 100;
var stars= [];
var size =5;
var fl = canvas.width;
var centerX = canvas.width/2;
var centerY = canvas.height/2;
var speed = 15;
for(var i=0; i<numStars;i++){
	stars[i] = new Star();
}


function Star(){
	this.x = Math.random()*canvas.width;
	this.y = Math.random()*canvas.height;
	this.z = Math.random()*canvas.width;
	this.move = function(){
		this.z = this.z-speed;
		if(this.z<=0){
		    this.z = canvas.width;
	     }
	
	}	
	


this.show = function(){
	var x,y,s
	x = (this.x - centerX) * (fl/this.z);
	x =  x + centerX;
	
	y = (this.y - centerY) * (fl/this.z);
	y=y+centerY
	
	s= size *(fl/this.z);
	
	c.beginPath();
	c.fillStyle = "white";
	c.arc(x,y,s, 0, Math.PI*2);
	c.fill();
}
}


function draw(){
c.fillStyle = "#663300";
c.fillRect(0,0,canvas.width,canvas.height);	
for(var i=0; i<numStars;i++){
stars[i].show();
stars[i].move();
}

}

function update(){
	draw();
	window.requestAnimationFrame(update);
	
}
update();