// 93958

var tileSize = 16;
var mapWidth = 64;
var mapHeight = 50;
var mapZoom = 1;

var mouseoverTileCoords = [0, 0];
var selectedTileCoords = [32, 25];


function onLoaded(){
  var level = null;
  var graphicsMenu = null;
  var graphicsTiles = null;
  var graphicsTilesMouseover = null;

  level = generateLevel();
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

  var selectedTileText = new PIXI.Text("Selected Tile: " + selectedTileCoords,
                                       { font: "12px Arial", fill: "#FFFFFF", align: "left"});

  var mousePressPoint = [0, 0];
  tilesContainer.mousedown = tilesContainer.touchstart = function(data) {
    if(data.getLocalPosition(this.parent).x > 256) {
      this.dragging = true;
      mousePressPoint[0] = data.getLocalPosition(this.parent).x - this.position.x;
      mousePressPoint[1] = data.getLocalPosition(this.parent).y - this.position.y;

      selectedTileCoords = [Math.floor(mousePressPoint[0] / (tileSize * mapZoom)),
                            Math.floor(mousePressPoint[1] / (tileSize * mapZoom))];
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

      this.position.x = Math.max(this.position.x, -1 * tileSize * mapWidth * mapZoom + 1280);
      this.position.x = Math.min(this.position.x, 256);
      this.position.y = Math.max(this.position.y, -1 * tileSize * mapHeight * mapZoom + 800);
      this.position.y = Math.min(this.position.y, 0);
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
                            tileSize,
                            tileSize);
      graphicsTilesMouseover.endFill();
    }
  };

  graphicsMenu = new PIXI.Graphics();
  menuContainer.addChild(graphicsMenu);
  graphicsMenu.lineStyle(1, 0x000000, 1);
  graphicsMenu.beginFill(0xA08000, 1);
  graphicsMenu.drawRect(252, 0, 4, 800);
  graphicsMenu.endFill();
  graphicsMenu.lineStyle(0, 0x000000, 1);
  graphicsMenu.beginFill(0x203040, 1);
  graphicsMenu.drawRect(0, 0, 252, 800);
  graphicsMenu.endFill();

  selectedTileText.position.x = selectedTileText.position.y = 0;
  menuContainer.addChild(selectedTileText);

  menuContainer.addChild(menuButton("+", 0, 12,
                                   function(data){
                                     mapZoom = Math.min(mapZoom * 2, 8);
                                     tilesContainer.scale.x = tilesContainer.scale.y = mapZoom;

                                     tilesContainer.position.x = -1 * selectedTileCoords[0] * mapZoom *
                                       tileSize + tileSize * mapWidth / 2 + 256;
                                     tilesContainer.position.y = -1 * selectedTileCoords[1] * mapZoom *
                                       tileSize + tileSize * mapHeight / 2;

                                     tilesContainer.position.x = Math.max(tilesContainer.position.x, -1 * tileSize * mapWidth * mapZoom + 1280);
                                     tilesContainer.position.x = Math.min(tilesContainer.position.x, 256);
                                     tilesContainer.position.y = Math.max(tilesContainer.position.y, -1 * tileSize * mapHeight * mapZoom + 800);
                                     tilesContainer.position.y = Math.min(tilesContainer.position.y, 0);
                                   }));
  menuContainer.addChild(menuButton("-", 30, 12,
                                   function(data){
                                     mapZoom = Math.max(mapZoom / 2, 1);
                                     tilesContainer.scale.x = tilesContainer.scale.y = mapZoom;

                                     tilesContainer.position.x = -1 * selectedTileCoords[0] * mapZoom *
                                       tileSize + tileSize * mapWidth / 2 + 256;
                                     tilesContainer.position.y = -1 * selectedTileCoords[1] * mapZoom *
                                       tileSize + tileSize * mapHeight / 2;

                                     tilesContainer.position.x = Math.max(tilesContainer.position.x, -1 * tileSize * mapWidth * mapZoom + 1280);
                                     tilesContainer.position.x = Math.min(tilesContainer.position.x, 256);
                                     tilesContainer.position.y = Math.max(tilesContainer.position.y, -1 * tileSize * mapHeight * mapZoom + 800);
                                     tilesContainer.position.y = Math.min(tilesContainer.position.y, 0);
                                   }));


  requestAnimFrame(animate);
}

function animate() {
  requestAnimFrame(animate);
  renderer.render(stage);
}

function menuButton(text, x, y, callback) {
  var button = new PIXI.Text(text, { font: "30px Arial", fill: "#FFFFFF", align: "left"});
  button.position.x = x;
  button.position.y = y;
  button.interactive = true;
  button.buttonMode = true;
  button.mousedown = button.touchstart = function(data){
    button.setStyle({ fill: "#FFFF00" });
  };
  button.mouseup = button.touchend = function(data){
    callback();
    button.setStyle({ fill: "#FFFFFF" });
  };
  button.mouseupoutside = button.touchendoutside = function(data){
    button.setStyle({ fill: "#FFFFFF" });
  };
  button.mouseout = function(data){
    button.setStyle({ fill: "#FFFFFF" });
  };
  return button;
}
