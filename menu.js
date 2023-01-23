Menu.prototype = new PIXI.Container();
Menu.prototype.constructor = Menu;

function Menu(){

  new PIXI.Container(this);
  this.interactive = true;

  this.background = new PIXI.Graphics();
  this.background.lineStyle(1, 0x000000, 1);
  this.background.beginFill(0xA08000, 1);
  this.background.drawRect(menuBarWidth - 4, 0, 4, 800);
  this.background.endFill();
  this.background.lineStyle(0, 0x000000, 1);
  this.background.beginFill(0x203040, 1);
  this.background.drawRect(0, 0, menuBarWidth - 4, 800);
  this.background.endFill();
  this.addChild(this.background);

  this.selectedTileText = new PIXI.Text("Selected Tile: " + 1);
  const tileTextStyle = new PIXI.TextStyle(
    { fontSize: "10p", fontFamily: " Arial", fill: "#FFFFFF", align: "left"}
    );
  this.selectedTileText.style = tileTextStyle;
  this.addChild(this.selectedTileText);

  this.addMenuButton("+", 0, 12, tilemap, tilemap.zoomIn);
  this.addMenuButton("-", 30, 12, tilemap, tilemap.zoomOut);
}

Menu.prototype.addMenuButton = function(text, x, y, obj, callback){
  var button = new PIXI.Text(text, new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFFFF"}));
  button.position.x = x;
  button.position.y = y;
  button.interactive = true;
  button.buttonMode = true;
  button.hitArea = new PIXI.Rectangle(0, 12, 30, 30);
  button.on('mousedown', function(data){
    mousedown(data, button);
  });
  button.on('touchstart', function(data){
    mousedown(data, button);
  });
  button.on('mouseover', function(data){
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFF00" });
  });
  button.on('mouseup', function(data){
    mouseup(data, button, callback, obj);
  });
  button.on('touchend', function(data){
    mouseup(data, button, callback, obj);
  });
  button.on('mouseupoutside', function(data){
    mouseup_outside(data, button);
  });
  button.on('touchendoutside', function(data){
    mouseup_outside(data, button);
  });
  button.on('mouseout', function(data){
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFFFF" });
  });
  this.addChild(button);
}

function mousedown(data, button) {
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FF0000" });
}

function mouseup(data, button, callback, obj) {
    callback.call(obj);
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFFFF" });
}

function mouseup_outside(data, button) {
  button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFFFF" });
}