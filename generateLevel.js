function generateLevel(){
  var level = [];

  // fill with ocean
  for(var i=0; i < mapWidth; i++){
    var currentRow = [];
    for(var j=0; j < mapHeight; j++){
      var tile = {terrainSprite: PIXI.Sprite.fromFrame(0), terrain: 0, upgrades: [], units: []};
      currentRow.push(tile);
    }
    level.push(currentRow);
  }

  // spawn some landmasses
  for(var j=0; j<25; j++){ // number of landmasses
    for(var i=0; i<12; i++){ // size of landmasses
      spawnLandmass(level, Math.floor(i / 2) + 1,
                    Math.floor(Math.random()*mapWidth), Math.floor(Math.random()*mapHeight));
    }
  }

  // add tile sprites to game
  for(var i=0; i < mapWidth; i++){
    for(var j=0; j < mapHeight; j++){
      var sprite = level[i][j].terrainSprite;
      sprite.position.x = tileSize * i;
      sprite.position.y = tileSize * j;

      tilesContainer.addChild(sprite);
    }
  }

  return level;
}

function spawnLandmass(level, size, x, y)
{
  x = Math.max(x, 0);
  x = Math.min(x, mapWidth - 1);
  y = Math.max(y, 0);
  y = Math.min(y, mapHeight - 1);

  if(level[x][y].terrain < size){
    level[x][y].terrain = Math.min(Math.max(1,
                             Math.floor(size / (Math.random() + 0.9))), 4);
    level[x][y].terrainSprite = PIXI.Sprite.fromFrame(level[x][y].terrain);
  }

  for(var i = 0; i<size; i++){
    var horiz = Math.floor(Math.random() * 3) - 1;
    var vert = Math.floor(Math.random() * 3) - 1;
    spawnLandmass(level, size - 1, x + horiz, y + vert);
  }
}
