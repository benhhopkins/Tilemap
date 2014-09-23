var tileSize = 16;

var mapBorderLeft = 256;



function onLoaded(){
  var level = null;
  var graphics = null;

  level = generateLevel();


  requestAnimFrame(animate);
}
function animate() {
  requestAnimFrame(animate);
  renderer.render(stage);
}
