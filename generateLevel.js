function generateLevel(){
  var level = [];

  // fill with ocean
  for(var i=0; i<64; i++){
    var currentRow = [];
    for(var j=0; j < 50; j++){
      var tile = {terrain: 0, upgrades: [], units: []};
      currentRow.push(0);
    }
    level.push(currentRow);
  }

  // spawn some landmasses
  for(var j=0; j<8; j++){
    for(var i=0; i<10; i++){
      spawnLandmass(level, Math.floor(i / 2) + 1,
                    Math.floor(Math.random()*64), Math.floor(Math.random()*50));
    }
  }


  return level;
}

function spawnLandmass(level, size, x, y)
{
  x = Math.max(x, 0);
  x = Math.min(x, 63);
  y = Math.max(y, 0);
  y = Math.min(y, 49);

  if(level[x][y] < size){
    level[x][y] = Math.min(Math.max(1, size - Math.floor(Math.random() + .7)), 3);
  }

  for(var i = 0; i<size; i++){
    var horiz = Math.floor(Math.random() * 3) - 1;
    var vert = Math.floor(Math.random() * 3) - 1;
    spawnLandmass(level, size - 1, x + horiz, y + vert);
  }
}
