/* global log, Packets, Modules */

define(function() {

    /**
     * This is a player handler, responsible for all the callbacks
     * without having to clutter up the entire game file.
     */

    return Class.extend({

        init: function(game, player) {
            var self = this;

            self.game = game;
            self.camera = game.getCamera();
            self.input = game.input;
            self.player = player;
            self.entities = game.entities;
            self.socket = game.socket;
            self.renderer = game.renderer;

            self.load();
        },

        load: function() {
            var self = this;

            self.player.onRequestPath(function(x, y) {
                var ignores = [self.player];

                if (self.player.hasTarget())
                    ignores.push(self.player.target);

                self.socket.send(Packets.Movement, [Packets.MovementOpcode.Request, x, y, self.player.gridX, self.player.gridY]);

                return self.game.findPath(self.player, x, y, ignores);
            });

            self.player.onStartPathing(function(path) {
                var i = path.length - 1;

                self.input.selectedX = path[i][0];
                self.input.selectedY = path[i][1];
                self.input.selectedCellVisible = true;

                if (!self.game.getEntityAt(self.input.selectedX, self.input.selectedY))
                    self.socket.send(Packets.Target, [Packets.TargetOpcode.None]);

                self.socket.send(Packets.Movement, [Packets.MovementOpcode.Started, self.input.selectedX, self.input.selectedY, self.player.gridX, self.player.gridY]);
            });

            self.player.onStopPathing(function(x, y) {
                self.entities.unregisterPosition(self.player);
                self.entities.registerPosition(self.player);

                self.input.selectedCellVisible = false;

                self.camera.clip();

                var id = null,
                    entity = self.game.getEntityAt(x, y, true);

                if (entity)
                    id = entity.id;

                self.socket.send(Packets.Movement, [Packets.MovementOpcode.Stop, x, y, id]);

                if (self.player.target) {
                    self.socket.send(Packets.Target, [self.player.target.type === 'mob' ? Packets.TargetOpcode.Attack : Packets.TargetOpcode.Talk, self.player.target.id]);
                    self.player.lookAt(self.player.target);
                }
            });

            self.player.onBeforeStep(function() {
                self.entities.unregisterPosition(self.player);
            });

            self.player.onStep(function() {
                if (self.player.hasNextStep())
                    self.entities.registerDuality(self.player);

                if (!self.camera.centered)
                    self.checkBounds();

                self.socket.send(Packets.Movement, [Packets.MovementOpcode.Step, self.player.gridX, self.player.gridY]);
            });

            self.player.onSecondStep(function() {
                self.renderer.updateAnimatedTiles();
            });

            self.player.onMove(function() {
                /**
                 * This is a callback representing the absolute exact position of the player.
                 */

                if (self.camera.centered)
                    self.camera.centreOn(self.player);
            });
        },

        checkBounds: function() {
            var self = this,
                x = self.player.gridX - self.camera.gridX,
                y = self.player.gridY - self.camera.gridY,
                isBorder = false;

            if (x === 0)
                self.game.zoning.setLeft();
            else if (y === 0)
                self.game.zoning.setUp();
            else if (x === self.camera.gridWidth - 1)
                self.game.zoning.setRight();
            else if (y === self.camera.gridHeight - 1)
                self.game.zoning.setDown();

            if (self.game.zoning.direction !== null) {
                self.camera.zone(self.game.zoning.getDirection());
                self.game.zoning.reset();
            }

        }

    });

});