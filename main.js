// 93958

var tileSize = 16;
var mapWidth = 64;
var mapHeight = 50;
var mapZoom = 2;


function onLoaded(){
  var level = null;
  var graphics = null;

  level = generateLevel();


  tilesContainer.scale.x = tilesContainer.scale.y = mapZoom;

  var mousePressPoint = [0, 0];
  tilesContainer.mousedown = tilesContainer.touchstart = function(data) {
    this.dragging = true;
    mousePressPoint[0] = data.getLocalPosition(this.parent).x - this.position.x;
    mousePressPoint[1] = data.getLocalPosition(this.parent).y - this.position.y;
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
  }

  graphics = new PIXI.Graphics();
  menuContainer.addChild(graphics);
  graphics.lineStyle(1, 0x000000, 1);
  graphics.beginFill(0xA08000, 1);
  graphics.drawRect(252, 0, 4, 800);
  graphics.endFill();
  graphics.lineStyle(0, 0x000000, 1);
  graphics.beginFill(0x203040, 1);
  graphics.drawRect(0, 0, 252, 800);
  graphics.endFill();


  requestAnimFrame(animate);
}
function animate() {
  requestAnimFrame(animate);
  renderer.render(stage);
}
