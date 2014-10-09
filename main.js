// define a few globals here
var stage = null;
var renderer = null;
var renderWidth = 800;
var renderHeight = 600;

var tilemap = null;
var menu = null;
var menuBarWidth = 120;

function Main(tilesPath, w, h){
  // For zoomed-in pixel art, we want crisp pixels instead of fuzziness
  PIXI.scaleModes.DEFAULT = PIXI.scaleModes.NEAREST;

  // Create the stage. This will be used to add sprites (or sprite containers) to the screen.
  stage = new PIXI.Stage(0x888888);
  // Create the renderer and add it to the page.
  // (autoDetectRenderer will choose hardware accelerated if possible)
  if(w != 0 && h != 0){
    renderWidth = w;
    renderHeight = h;
  }
  renderer = PIXI.autoDetectRenderer(renderWidth, renderHeight);
  //document.body.appendChild(renderer.view);

  // Set up the asset loader for sprite images with the .json data and a callback
  var tileAtlas = [tilesPath + "tiles.json"];
  var loader = new PIXI.AssetLoader(tileAtlas);
  loader.onComplete = onLoaded;
  loader.load();

  return renderer.view;
}

// called when sprites are finished loading
function onLoaded(){
  tilemap = new Tilemap(64, 50);
  tilemap.position.x = menuBarWidth;
  stage.addChild(tilemap);

  menu = new Menu();
  stage.addChild(menu);

  // zoom in on the starting tile
  tilemap.selectTile(tilemap.startLocation.x, tilemap.startLocation.y);
  tilemap.zoomIn();

  // begin drawing
  requestAnimFrame(animate);
}

function animate() {
  requestAnimFrame(animate);
  renderer.render(stage);
}
