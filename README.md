Tilemap
=======

Basic zoomable, draggable tilemap using Pixi.js

To use jQuery to add the Pixi canvas to a page:

$("#demo").append(Main("", 800, 600));

Replace "" with any path if the sprite resources aren't in the current directory, and 800x600 with the desired size.

TienTN changes:
==============

2022/01/22
----------

Upgraded jquery to 3.6.3 (no problem)

from v1.5.1 to pixijs 2.2.7 (no problem)

From pixijs v3, they have massive changes every major version: 3,4,5,6,7. My target is to reach to latest version 7.1

from v2.2.7 to v3.0.0

    pixijs no longer use old Loader from v3, change to new Loader
    
from v3.0.0 to v4.8.9

    the loader.onComplete.add only available from v4.8.8

    no longer requestAnimFrame -> use requestAnimationFrame

    data.getLocalPosition

        data.constructor.toString() -> InteractionEvent

        pixiljs now has PIXI.InterractionData with getLocalPosition so I think it can help if we convert to InterractionData...

        I've found out that they have moved InterractionData into the .data object inside event, so I changed it accordingly.
    
    deprecation.js:37 You do not need to use a PIXI Stage any more, you can simply render any container.

        so I changed the Stage in main.js from PIXI.Stage to PIXI.Container
   
    pending issue in v4.8.9

        deprecation.js:25 Deprecation Warning: text style property 'font' is now deprecated, please use the 'fontFamily','fontSize',fontStyle','fontVariant' and 'fontWeight' properties from now on

        
