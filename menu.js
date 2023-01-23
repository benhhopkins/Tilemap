Menu.prototype = new PIXI.Container();
Menu.prototype.constructor = Menu;

function Menu(){

  PIXI.Container.call(this);
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
  button.mousedown = button.touchstart = function(data){
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FF0000" });
  };
  button.mouseover = function(data){
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFF00" });
  };
  button.mouseup = button.touchend = function(data){
    callback.call(obj);
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFFFF" });
  };
  button.mouseupoutside = button.touchendoutside = function(data){
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFFFF" });
  };
  button.mouseout = function(data){
    button.style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: "40px", fill: "#FFFFFF" });
  };
  this.addChild(button);
}