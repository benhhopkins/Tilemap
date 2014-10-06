var tilesContainer = null;
var menuContainer = null;
var menuBarWidth = 256;

var tileSize = 16;
var mapWidth = 64;
var mapHeight = 50;
var mapZoom = 2;

var level = null;
var graphicsMenu = null;
var graphicsTiles = null;
var graphicsTilesMouseover = null;

var selectedTileText = null;

var mouseoverTileCoords = [0, 0];
var selectedTileCoords = [32, 25];

var tilesCities = [];
var tilesFarms = [];
var tilesMines = [];

var units = [];

function onLoaded(){
  tilesContainer = new Tilemap(mapWidth, mapHeight);
  tilesContainer.position.x = 256;
  tilesContainer.interactive = true;
  stage.addChild(tilesContainer);

  menuContainer = new PIXI.DisplayObjectContainer();
  menuContainer.interactive = true;
  stage.addChild(menuContainer);


  //level = generateLevel();
  graphicsTiles = new PIXI.Graphics();
  tilesContainer.addChild(graphicsTiles);
  graphicsTilesMouseover = new PIXI.Graphics();
  tilesContainer.addChild(graphicsTilesMouseover);

  graphicsTiles.lineStyle(2, 0xFFFF00, 1);
  graphicsTiles.beginFill(0x000000, 0);
  graphicsTiles.drawRect(selectedTileCoords[0] * tileSize,
                         selectedTileCoords[1] * tileSize,
                         tileSize,
                         tileSize);
  graphicsTiles.endFill();

  tilesContainer.scale.x = tilesContainer.scale.y = mapZoom;

  selectedTileText = new PIXI.Text("Selected Tile: " + selectedTileCoords,
                                       { font: "12px Arial", fill: "#FFFFFF", align: "left"});

  var mousePressPoint = [0, 0];
  tilesContainer.mousedown = tilesContainer.touchstart = function(data) {
    if(data.getLocalPosition(this.parent).x > menuBarWidth) {
      this.dragging = true;
      mousePressPoint[0] = data.getLocalPosition(this.parent).x - this.position.x;
      mousePressPoint[1] = data.getLocalPosition(this.parent).y - this.position.y;

      selectTile(Math.floor(mousePressPoint[0] / (tileSize * mapZoom)),
                 Math.floor(mousePressPoint[1] / (tileSize * mapZoom)));
    }
  };
  tilesContainer.mouseup = tilesContainer.mouseupoutside =
    tilesContainer.touchend = tilesContainer.touchendoutside = function(data) {
    this.dragging = false;
  };
  tilesContainer.mousemove = tilesContainer.touchmove = function(data)
  {
    if(this.dragging)
    {
      var position = data.getLocalPosition(this.parent);
      this.position.x = position.x - mousePressPoint[0];
      this.position.y = position.y - mousePressPoint[1];

      constrainTilemap();
    }
    else{
      var mouseOverPoint = [0, 0];
      mouseOverPoint[0] = data.getLocalPosition(this.parent).x - this.position.x;
      mouseOverPoint[1] = data.getLocalPosition(this.parent).y - this.position.y;

      mouseoverTileCoords = [Math.floor(mouseOverPoint[0] / (tileSize * mapZoom)),
                            Math.floor(mouseOverPoint[1] / (tileSize * mapZoom))];
      graphicsTilesMouseover.clear();
      graphicsTilesMouseover.lineStyle(1, 0xFFFFFF, 1);
      graphicsTilesMouseover.beginFill(0x000000, 0);
      graphicsTilesMouseover.drawRect(mouseoverTileCoords[0] * tileSize,
                            mouseoverTileCoords[1] * tileSize,
                            tileSize - 1,
                            tileSize - 1);
      graphicsTilesMouseover.endFill();
    }
  };

  graphicsMenu = new PIXI.Graphics();
  menuContainer.addChild(graphicsMenu);
  graphicsMenu.lineStyle(1, 0x000000, 1);
  graphicsMenu.beginFill(0xA08000, 1);
  graphicsMenu.drawRect(menuBarWidth - 4, 0, 4, 800);
  graphicsMenu.endFill();
  graphicsMenu.lineStyle(0, 0x000000, 1);
  graphicsMenu.beginFill(0x203040, 1);
  graphicsMenu.drawRect(0, 0, menuBarWidth - 4, 800);
  graphicsMenu.endFill();

  selectedTileText.position.x = selectedTileText.position.y = 0;
  menuContainer.addChild(selectedTileText);

  menuContainer.addChild(menuButton("+", 0, 12, zoomIn));
  menuContainer.addChild(menuButton("-", 30, 12, zoomOut));

  // zoom in on the starting tile
  selectTile(tilesContainer.startLocation.x, tilesContainer.startLocation.y);
  zoomIn();

  requestAnimFrame(animate);
}

function animate() {
  requestAnimFrame(animate);
  renderer.render(stage);
}

function menuButton(text, x, y, callback) {
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
    callback();
    button.setStyle({ font: "40px Arial", fill: "#FFFFFF" });
  };
  button.mouseupoutside = button.touchendoutside = function(data){
    button.setStyle({ font: "40px Arial", fill: "#FFFFFF" });
  };
  button.mouseout = function(data){
    button.setStyle({ font: "40px Arial", fill: "#FFFFFF" });
  };
  return button;
}

function selectTile(x, y){
  selectedTileCoords = [x, y];
  selectedTileText.setText("Selected Tile: " + selectedTileCoords);
  graphicsTiles.clear();
  graphicsTiles.lineStyle(2, 0xFFFF00, 1);
  graphicsTiles.beginFill(0x000000, 0);
  graphicsTiles.drawRect(selectedTileCoords[0] * tileSize,
                         selectedTileCoords[1] * tileSize,
                         tileSize,
                         tileSize);
  graphicsTiles.endFill();
}

function zoomIn(){
  mapZoom = Math.min(mapZoom * 2, 8);
  tilesContainer.scale.x = tilesContainer.scale.y = mapZoom;

  centerOnSelectedTile();
  constrainTilemap();
}

function zoomOut(){
  mapZoom = Math.max(mapZoom / 2, 1);
  tilesContainer.scale.x = tilesContainer.scale.y = mapZoom;

  centerOnSelectedTile();
  constrainTilemap();
}

function centerOnSelectedTile(){
  tilesContainer.position.x = (renderWidth - menuBarWidth) / 2 -
    selectedTileCoords[0] * mapZoom * tileSize -
    tileSize * mapZoom / 2 + menuBarWidth;
  tilesContainer.position.y = renderHeight / 2 -
    selectedTileCoords[1] * mapZoom * tileSize -
    tileSize * mapZoom / 2;
}

function constrainTilemap(){
  tilesContainer.position.x = Math.max(tilesContainer.position.x, -1 * tileSize * mapWidth * mapZoom + renderWidth);
  tilesContainer.position.x = Math.min(tilesContainer.position.x, menuBarWidth);
  tilesContainer.position.y = Math.max(tilesContainer.position.y, -1 * tileSize * mapHeight * mapZoom + renderHeight);
  tilesContainer.position.y = Math.min(tilesContainer.position.y, 0);
}
