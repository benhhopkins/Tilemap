Menu.prototype = new PIXI.DisplayObjectContainer();
Menu.prototype.constructor = Menu;

function Menu(){
  PIXI.DisplayObjectContainer.call(this);
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

  this.selectedTileText = new PIXI.Text("Selected Tile: " + 1,
                                       { font: "12px Arial", fill: "#FFFFFF", align: "left"});
  this.addChild(this.selectedTileText);

  this.addMenuButton("+", 0, 12, tilemap, tilemap.zoomIn);
  this.addMenuButton("-", 30, 12, tilemap, tilemap.zoomOut);
}

Menu.prototype.addMenuButton = function(text, x, y, obj, callback){
  var button = new PIXI.Text(text, { font: "40px Arial", fill: "#FFFFFF"});
  button.position.x = x;
  button.position.y = y;
  button.interactive = true;
  button.buttonMode = true;
  button.hitArea = new PIXI.Rectangle(0, 12, 30, 30);
  button.mousedown = button.touchstart = function(data){
    button.setStyle({ font: "40px Arial", fill: "#FF0000" });
  };
  button.mouseover = function(data){
    button.setStyle({ font: "40px Arial", fill: "#FFFF00" });
  };
  button.mouseup = button.touchend = function(data){
    callback.call(obj);
    button.setStyle({ font: "40px Arial", fill: "#FFFFFF" });
  };
  button.mouseupoutside = button.touchendoutside = function(data){
    button.setStyle({ font: "40px Arial", fill: "#FFFFFF" });
  };
  button.mouseout = function(data){
    button.setStyle({ font: "40px Arial", fill: "#FFFFFF" });
  };
  this.addChild(button);
}