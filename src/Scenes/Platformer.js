class Platformer extends Phaser.Scene {
    //built from the platformer improvement section assignment's code, with some occasional help from ChatGPT
    
    constructor() {
        super("platformerScene");
    }

    init(data) {
        // variables and settings
        //console.log('Init data received:', data);
        this.checkpoint0 = data.c0 || false;
        this.checkpoint1 = data.c1 || false;
        this.checkpoint2 = data.c2 || false;
        this.gameActive = true;
        this.ACCELERATION = 550;
        this.DRAG = 9000;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.spawnX = data.startX || 30;
        this.spawnY = data.startY || 1710;
    }

    create() {

        
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 144, 100);
        //this.map = this.make.tilemap({ key: 'platformer-level-1' });

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        this.ladderLayer = this.map.createLayer("Ladders-n-Trees", this.tileset, 0, 0);
        //this.add.image(30, 1710, 'back0')


        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // TODO: Add createFromObjects here
         // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 67
        });

        this.keys = this.map.createFromObjects("Objects", {
            name: "key",
            key: "tilemap_sheet",
            frame: 27
        });


        // TODO: Add turn into Arcade Physics here
        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.keys, Phaser.Physics.Arcade.STATIC_BODY);
        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.F
        this.coinGroup = this.add.group(this.coins);
        this.keyGroup = this.add.group(this.keys);

        // set up player avatar
        //console.log("spawn: ", this.spawnX, ", ", this.spawnY);
        
        my.sprite.player = this.physics.add.sprite(this.spawnX, this.spawnY, "platformer_characters", "tile_0000.png");
        console.log(this.checkpoint0)
        this.lastDirection = 0; 
        my.sprite.player.onLadder = false;
        my.sprite.player.onIce = false;
        my.sprite.player.setCollideWorldBounds(false);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        //console.log(my.sprite.player.x, ", ", my.sprite.player.y)

        this.groundLayer.forEachTile(tile => {
            if (tile.properties.collidesTop) {
                tile.setCollision(false, false, true, false); // Only enable collision on the top of the tile
            }
        });

        

        // TODO: Add coin collision handler
         // Handle collision detection with coins
         this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            this.sound.play('sfx_gem');
            obj2.destroy(); // remove coin on overlap

        });

        this.physics.add.overlap(my.sprite.player, this.keyGroup, (obj1, obj2) => {
            obj2.destroy(); // remove key on overlap
            this.sound.play('sfx_key');
            this.changeKeyTiles(this.groundLayer);
        });

        this.groundLayer.setTileIndexCallback(11, (sprite, tile) => {
            console.log('block', tile);
            this.sound.play('sfx_switch');
            this.changeWaterTiles(this.groundLayer);
        }, this);

        this.groundLayer.setTileIndexCallback(69, (sprite, tile) => {
            if (my.sprite.player.y <= tile.pixelY || tile.rotation != 0) {
                console.log('spikes', tile);
                this.sound.play('sfx_death');
                
                if(this.checkpoint2) this.scene.restart({c2: 1,startX: 1926, startY: 1710});
                else if(this.checkpoint1) this.scene.restart({c1: 1,startX: 1206, startY: 18});
                else if(this.checkpoint0) this.scene.restart({c0:1,startX: 1418, startY: 1674});
                else this.scene.restart({startX: 30, startY: 1710});
            }
        }, this);

        this.groundLayer.setTileIndexCallback(96, (sprite, tile) => {
            if (my.sprite.player.y <= tile.pixelY) {
                console.log('pipe', tile);
                this.sound.play('sfx_pipe');
                if(tile.x == 60) {this.checkpoint0 = 1; this.scene.restart({c0: 1, startX: 1418, startY: 1674});}
                else if(tile.x == 104) {this.checkpoint1 = 1; this.checkpoint0 = 0; this.scene.restart({c1: 1, startX: 1206, startY: 18});}
                else if(tile.x == 71) {this.checkpoint2 = 1; this.checkpoint1 = 0; this.checkpoint0 = 0; this.scene.restart({c2: 1, startX: 1926, startY: 1710});}
            }
        }, this);

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
/** 
        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
             = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);**/

        // TODO: Add movement vfx here
        // movement vfx

        my.vfx.walking = this.add.particles(0, 5, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add random: true
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            maxAliveParticles: 12,
            lifespan: 150,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.jumping = this.add.particles(0, 5, "kenny-particles", {
            frame: ["trace_07.png"],
            // TODO: Try: add random: true
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            maxAliveParticles: 12,
            lifespan: 150,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        my.vfx.jumping.stop();

        // TODO: add camera code here
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.clear()

    }

    changeKeyTiles(layer) {
        var targetIndex = 29;  // Index of the tiles to change
        var newIndex = 161;    
    
        layer.forEachTile(tile => {
            if (tile.index === targetIndex) {
                layer.putTileAt(newIndex, tile.x, tile.y);
            }
        });
    }

    changeWaterTiles(layer) {
        var targetIndex = 54;  // Index of the tiles to change
        var newIndex = 56;    
    
        layer.forEachTile(tile => {
            if (tile.index === targetIndex) {
                const newTile = layer.putTileAt(newIndex, tile.x, tile.y);
                newTile.rotation = Math.PI / 2;
                newTile.setCollision(true);
            }
        });

        layer.layer.data.forEach((row) => {
            row.forEach((tile) => {
                if (tile.index === newIndex) {
                    tile.setCollision(true);
                }
            });
        });
    
    }

    update() {

        if(this.gameActive) {

        //console.log(my.sprite.player.x, ", ", my.sprite.player.y)
        let playerTileX = this.map.worldToTileX(my.sprite.player.x);
        let playerTileY = this.map.worldToTileY(my.sprite.player.y);
        //console.log(playerTileX + ", " + playerTileY);
        let tile = this.ladderLayer.getTileAt(playerTileX, playerTileY);
        //if(tile != null) console.log(tile)
        if((tile && (tile.index == 72 || tile.index == 52 || tile.index == 97 || tile.index == 117 || tile.index == 137 || tile.index == 138 || tile.index == 118 || tile.index == 139) ) && (cursors.up.isDown || cursors.down.isDown)) {my.sprite.player.onLadder = true; }
        else if(!(tile && (tile.index == 72 || tile.index == 52 || tile.index == 97 || tile.index == 117 || tile.index == 137 || tile.index == 138 || tile.index == 118 || tile.index == 139) )) {my.sprite.player.onLadder = false; this.physics.world.gravity.y = 1500;}

        tile = this.map.getTileAtWorldXY(my.sprite.player.x, my.sprite.player.y + 18, true, this.cameras.main, this.groundLayer);
            if (tile && (tile.index === 76 || tile.index === 56)) {
                console.log("ice")
                my.sprite.player.onIce = true;
                //my.sprite.player.setDragX(400);
            } else {
                my.sprite.player.onIce = false;
                //my.sprite.player.setDragX(2000);
            }

        //else console.log("offladder")
        
        if (cursors.up.isDown && my.sprite.player.onLadder == true) {
            my.sprite.player.setVelocityY(-100);
            my.sprite.player.setVelocityX(0);
            my.sprite.player.setAccelerationX(0);
            my.vfx.jumping.stop();
        }
        else if(cursors.down.isDown && my.sprite.player.onLadder == true) {
            my.sprite.player.setVelocityY(100);
            my.sprite.player.setVelocityX(0);
            my.sprite.player.setAccelerationX(0);
            my.vfx.jumping.stop();
            this.physics.world.gravity.y = 0;
        }
        else if(my.sprite.player.onLadder == true) {
            my.sprite.player.setVelocityY(0);
            my.sprite.player.setVelocityX(0);
            my.sprite.player.setAccelerationX(0);
            my.vfx.jumping.stop();
            this.physics.world.gravity.y = 0;
        }
        else if(cursors.left.isDown && my.sprite.player.onLadder == false) {
            if(my.sprite.player.onIce == false && this.lastDirection == 1) my.sprite.player.setVelocityX(0);
            if(my.sprite.player.onIce || !my.sprite.player.body.blocked.down) my.sprite.player.setDragX(1);
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            //if(my.sprite.player.)
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }
            this.lastDirection = -1;

        } else if(cursors.right.isDown && my.sprite.player.onLadder == false) {
            if(my.sprite.player.onIce == false && this.lastDirection == -1) my.sprite.player.setVelocityX(0);
            if(my.sprite.player.onIce || !my.sprite.player.body.blocked.down) my.sprite.player.setDragX(1);
            my.sprite.player.setAccelerationX(this.ACCELERATION);

            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }
            this.lastDirection = 1;

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            if(my.sprite.player.onIce || !my.sprite.player.body.blocked.down) my.sprite.player.setDragX(1);
            else my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
            this.lastDirection = 0;

        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
            my.vfx.walking.stop();
            
        }
        else {my.vfx.jumping.stop(); }
        if((my.sprite.player.body.blocked.down || my.sprite.player.onLadder == true) && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            my.sprite.player.onLadder = false;
            this.physics.world.gravity.y = 1500;
            my.vfx.jumping.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            this.sound.play('sfx_jump');
            my.vfx.jumping.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            my.vfx.jumping.start();
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey) || my.sprite.player.y > 1800 || my.sprite.player.x < 0) {
            /**my.sprite.player.x = this.spawnX;
            my.sprite.player.y = this.spawnY;
            my.sprite.player.setVelocityY(0);
            my.sprite.player.setVelocityX(0);
            my.sprite.player.setAccelerationX(0);
            this.physics.world.gravity.y = 1500;**/
            this.sound.play('sfx_death');
            if(this.checkpoint2) this.scene.restart({c2: 1, startX: 1926, startY: 1710});
            else if(this.checkpoint1) this.scene.restart({c1: 1, startX: 1206, startY: 18});
            else if(this.checkpoint0) this.scene.restart({c0: 1, startX: 1418, startY: 1674});
            else this.scene.restart({startX: 30, startY: 1710});
        }

        else if(my.sprite.player.x > 2376) {this.sound.play('sfx_clear'); my.vfx.jumping.stop(); my.sprite.player.destroy(); this.gameActive = false;}

        }
        else {
            this.txt = this.add.text(1926, 1404, "GAME OVER - PRESS R", { font: '32px Press Start 2P', color: "#ffffff"});

            if(this.rKey.isDown) this.scene.restart();
        }
    }
}