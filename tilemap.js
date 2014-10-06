Tilemap.prototype = new PIXI.DisplayObjectContainer();
Tilemap.prototype.constructor = Tilemap;

function Tilemap(width, height){
  PIXI.DisplayObjectContainer.call(this);

  this.tilesWidth = width;
  this.tilesHeight = height;

  this.tileSize = 16;
  this.zoom = 2;

  this.startLocation = { x: 0, y: 0 };

  this.generateMap();
}

Tilemap.prototype.addTile = function(x, y, terrain){
  var tile = PIXI.Sprite.fromFrame(terrain);
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
                         Math.floor(Math.random()*mapWidth),
                         Math.floor(Math.random()*mapHeight));
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
  x = Math.min(x, mapWidth - 1);
  y = Math.max(y, 0);
  y = Math.min(y, mapHeight - 1);

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