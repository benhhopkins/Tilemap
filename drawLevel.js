function drawLevel(level, graphics){
  graphics.lineStyle(0, 0x808080, 1);

  for(var i=0; i<level.length; i++){
    for(var j=0; j<level[i].length; j++){
      graphics.beginFill(getTileColor(level[i][j]), 1);
      graphics.drawRect(mapBorderLeft + i*tileSize, j*tileSize, tileSize, tileSize);
      graphics.endFill();
    }
  }
}

function getTileColor(id){
  switch(id){
    case(0):
      return 0x002090;
    case(1):
      return 0x20A040;
    case(2):
      return 0x308030;
    case(3):
      return 0x606020;
    default:
      return 0x000000;
  }
}
