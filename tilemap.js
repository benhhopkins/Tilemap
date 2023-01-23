Tilemap.prototype = new PIXI.Container();
Tilemap.prototype.constructor = Tilemap;

function mouse_down(evt, this_ptr) {

  if(evt.client.x > menuBarWidth) {
    this_ptr.dragging = true;
    this_ptr.mousePressPoint[0] = evt.client.x - this_ptr.position.x;
    this_ptr.mousePressPoint[1] = evt.client.y - this_ptr.position.y;

    this_ptr.selectTile(Math.floor(this_ptr.mousePressPoint[0] / (this_ptr.tileSize * this_ptr.zoom)),
               Math.floor(this_ptr.mousePressPoint[1] / (this_ptr.tileSize * this_ptr.zoom)));
  }
}

function mouse_up(evt, this_ptr) {
  this_ptr.dragging = false;
}

function mouse_move(evt, this_ptr) {

  if(this_ptr.dragging)
  {
    var position = evt.client;
    this_ptr.position.x = position.x - this_ptr.mousePressPoint[0];
    this_ptr.position.y = position.y - this_ptr.mousePressPoint[1];

    this_ptr.constrainTilemap();
  }
  else{
    var mouseOverPoint = [0, 0];
    mouseOverPoint[0] = evt.client.x - this_ptr.position.x;
    mouseOverPoint[1] = evt.client.y - this_ptr.position.y;

    var mouseoverTileCoords = [Math.floor(mouseOverPoint[0] / (this_ptr.tileSize * this_ptr.zoom)),
                          Math.floor(mouseOverPoint[1] / (this_ptr.tileSize * this_ptr.zoom))];
    this_ptr.mouseoverGraphics.clear();
    this_ptr.mouseoverGraphics.lineStyle(1, 0xFFFFFF, 1);
    this_ptr.mouseoverGraphics.beginFill(0x000000, 0);
    this_ptr.mouseoverGraphics.drawRect(mouseoverTileCoords[0] * this_ptr.tileSize,
                          mouseoverTileCoords[1] * this_ptr.tileSize,
                          this_ptr.tileSize - 1,
                          this_ptr.tileSize - 1);
    this_ptr.mouseoverGraphics.endFill();
  }

}

function Tilemap(width, height){
  var myObj = new PIXI.Container(this);
  this.interactive = true;

  this.tilesWidth = width;
  this.tilesHeight = height;

  this.tileSize = 16;
  this.zoom = 2;
  this.scale.x = this.scale.y = this.zoom;

  this.startLocation = { x: 0, y: 0 };
  // fill the map with tiles
  this.generateMap();

  // variables and functions for moving the map
  this.mouseoverTileCoords = [0, 0];
  this.selectedTileCoords = [0, 0];
  this.mousePressPoint = [0, 0];
  this.selectedGraphics = new PIXI.Graphics();
  this.mouseoverGraphics = new PIXI.Graphics();
  this.addChild(this.selectedGraphics);
  this.addChild(this.mouseoverGraphics);

  this.on('mousedown', function(data) {
    mouse_down(data, this);
  });
  this.on('touchstart', function(data) {
    mouse_down(data, this);
  });
  this.on('mouseup', function(data) {
    mouse_up(data, this);
  });
  this.on('mouseupoutside', function(data) {
    mouse_up(data, this);
  });
  this.on('touchend', function(data) {
    mouse_up(data, this);
  });
  this.on('touchendoutside', function(data) {
    mouse_up(data, this);
  });
  this.on('mousemove', function(evt) {
    mouse_move(evt, this);
  });
  this.on('touchmove', function(evt) {
    mouse_move(evt, this);
  });
}

Tilemap.prototype.addTile = function(x, y, terrain){
  var tile = PIXI.Sprite.from(terrain.toString());
  tile.position.x = x * this.tileSize;
  tile.position.y = y * this.tileSize;
  tile.tileX = x;
  tile.tileY = y;
  tile.terrain = terrain;
  this.addChildAt(tile, x * this.tilesHeight + y);
}

Tilemap.prototype.changeTile = function(x, y, terrain){
  this.removeChild(this.getTile(x, y));
  this.addTile(x, y, terrain);
}

Tilemap.prototype.getTile = function(x, y){
  return this.getChildAt(x * this.tilesHeight + y);
}

Tilemap.prototype.generateMap = function(){
  // fill with ocean
  for(var i = 0; i < this.tilesWidth; ++i){
    var currentRow = [];
    for(var j=0; j < this.tilesHeight; j++){
      this.addTile(i, j, 0);
    }
  }

  // spawn some landmasses
  for(var j=0; j<25; j++){ // number of landmasses
    for(var i=0; i<12; i++){ // size seed of landmasses
      this.spawnLandmass(Math.floor(i / 2) + 1,
                         Math.floor(Math.random()*this.tilesWidth),
                         Math.floor(Math.random()*this.tilesHeight));
    }
  }

  // starting location
  var found = false;
  while(!found){
    var x = Math.floor(Math.random() * this.tilesWidth);
    var y = Math.floor(Math.random() * this.tilesHeight);
    var tile = this.getTile(x, y);
    if(tile.terrain == 2){
      this.changeTile(x, y, 5);
      this.startLocation.x = x;
      this.startLocation.y = y;
      found = true;
    }
  }

}

Tilemap.prototype.spawnLandmass = function(size, x, y){
  x = Math.max(x, 0);
  x = Math.min(x, this.tilesWidth - 1);
  y = Math.max(y, 0);
  y = Math.min(y, this.tilesHeight - 1);

  if(this.getTile(x, y).terrain < size){
    this.changeTile(x, y, Math.min(4, Math.max(1, Math.floor(size /
                                                             (Math.random() + 0.9)))));
  }

  for(var i = 0; i<size; i++){
    var horiz = Math.floor(Math.random() * 3) - 1;
    var vert = Math.floor(Math.random() * 3) - 1;
    this.spawnLandmass(size - 1, x + horiz, y + vert);
  }
}

Tilemap.prototype.selectTile = function(x, y){
  this.selectedTileCoords = [x, y];
  menu.selectedTileText.text = "Selected Tile: " + this.selectedTileCoords;
  this.selectedGraphics.clear();
  this.selectedGraphics.lineStyle(2, 0xFFFF00, 1);
  this.selectedGraphics.beginFill(0x000000, 0);
  this.selectedGraphics.drawRect(this.selectedTileCoords[0] * this.tileSize,
                         this.selectedTileCoords[1] * this.tileSize,
                         this.tileSize,
                         this.tileSize);
  this.selectedGraphics.endFill();
}

Tilemap.prototype.zoomIn = function(){
  this.zoom = Math.min(this.zoom * 2, 8);
  this.scale.x = this.scale.y = this.zoom;

  this.centerOnSelectedTile();
  this.constrainTilemap();
}

Tilemap.prototype.zoomOut = function(){
  this.mouseoverGraphics.clear();

  this.zoom = Math.max(this.zoom / 2, 1);
  this.scale.x = this.scale.y = this.zoom;

  this.centerOnSelectedTile();
  this.constrainTilemap();
}

Tilemap.prototype.centerOnSelectedTile = function(){
  this.position.x = (renderWidth - menuBarWidth) / 2 -
    this.selectedTileCoords[0] * this.zoom * this.tileSize -
    this.tileSize * this.zoom / 2 + menuBarWidth;
  this.position.y = renderHeight / 2 -
    this.selectedTileCoords[1] * this.zoom * this.tileSize -
    this.tileSize * this.zoom / 2;
}

Tilemap.prototype.constrainTilemap = function(){
  this.position.x = Math.max(this.position.x, -1 * this.tileSize * this.tilesWidth * this.zoom + renderWidth);
  this.position.x = Math.min(this.position.x, menuBarWidth);
  this.position.y = Math.max(this.position.y, -1 * this.tileSize * this.tilesHeight * this.zoom + renderHeight);
  this.position.y = Math.min(this.position.y, 0);
}