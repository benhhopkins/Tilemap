var tileSize = 16;

var mapBorderLeft = 256;

function onLoaded(){
  var level = null;
  var graphics = null;

  graphics = new PIXI.Graphics();
  gameContainer.addChild(graphics);

  level = generateLevel();
  drawLevel(level, graphics);


  requestAnimFrame(animate);
}
function animate() {
  requestAnimFrame(animate);
  renderer.render(stage);
}
