define(['jquery'], function($) {

    return Class.extend({

        init: function(game) {
            var self = this;

            self.game = game;
            self.body = $('#inventory');
        }

    });

});