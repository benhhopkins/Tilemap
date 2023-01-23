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

Dev note:
---------

    TienTN: Note that we include pixi.js directly, not import so every class use must goes under PIXI.* ... eg.: PIXI.TextStyle

    It may cause some issues if we include this other project which uses module ... sort of.

    About pixi.dev.js: I have stopped using it, because I want to link it directly from PIXI's server.

2022/01/23
----------

From v4.8.9 to v5.3.12

    This version bigger change from v4 so I seeked some help in here https://github.com/pixijs/pixijs/wiki/v5-Migration-Guide

    But actually, it doesn't help because they missed a lot of changes in that document, I can't believe it!

    *My changes:*

    Frames loading mechanism changes:

        The Sprite.from did not work, after a while, I have figured out that it seems from v5, pixi changed to use https://github.com/englercj/resource-loader and it utilizes dictionary instead of array for frames(At least, I can't find any JSON with array format on that site).

        So I changed the JSON format accordingly. But I still keep the "file_name" field as origin, though may be, it won't be used. Just for easier referencing.   

        The result is ... yeah it is much faster thank to the power of the new render engine.

    Error fix:

        menu.js:38 Uncaught TypeError: button.setStyle is not a function

            button is a Text object, I have changed all button.setStyle() to button.style = ...

            But, new Pixi's Text implement now use new structure of TextStyle and fontFamily, fontSize tags ... so I have to changed it also.
    
    Warning fix:

        PixiJS Deprecation Warning: PIXI.loader instance has moved to PIXI.Loader.shared

        PixiJS Deprecation Warning: PIXI.Sprite.fromFrame method is deprecated, use PIXI.Sprite.from
