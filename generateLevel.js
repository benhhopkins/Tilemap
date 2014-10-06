function generateLevel(){
  var level = [];

  // fill with ocean
  for(var i=0; i < mapWidth; i++){
    var currentRow = [];
    for(var j=0; j < mapHeight; j++){
      var tile = {sprite: PIXI.Sprite.fromFrame(0), terrain: 0, position: {x: i, y: j}};
      currentRow.push(tile);
    }
    level.push(currentRow);
  }

  // spawn some landmasses
  for(var j=0; j<25; j++){ // number of landmasses
    for(var i=0; i<12; i++){ // size seed of landmasses
      spawnLandmass(level, Math.floor(i / 2) + 1,
                    Math.floor(Math.random()*mapWidth), Math.floor(Math.random()*mapHeight));
    }
  }

  // add tile sprites to game
  for(var i=0; i < mapWidth; i++){
    for(var j=0; j < mapHeight; j++){
      var sprite = level[i][j].sprite;
      sprite.position.x = tileSize * i;
      sprite.position.y = tileSize * j;

      tilesContainer.addChild(sprite);
    }
  }

  // starting location
  var found = false;
  while(!found){
    var x = Math.floor(Math.random()*mapWidth);
    var y = Math.floor(Math.random()*mapHeight);
    var tile = level[x][y];
    if(tile.terrain == 2){
      tilesContainer.removeChild(tile.sprite);
      tile.terrain = 5;
      tile.sprite = PIXI.Sprite.fromFrame(tile.terrain);
      tile.sprite.position.x = tileSize * x;
      tile.sprite.position.y = tileSize * y;
      tilesContainer.addChild(tile.sprite);
      tilesCities.push(tile);
      found = true;
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
    level[x][y].sprite = PIXI.Sprite.fromFrame(level[x][y].terrain);
  }

  for(var i = 0; i<size; i++){
    var horiz = Math.floor(Math.random() * 3) - 1;
    var vert = Math.floor(Math.random() * 3) - 1;
    spawnLandmass(level, size - 1, x + horiz, y + vert);
  }
}
