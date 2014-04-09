/* global console:false, player: false */

$(document).ready(function() {
    'use strict';
    var playerModel = new player.PlayerModel(document.getElementById('audioTag'));
    var playerController = new player.PlayerController(playerModel);
    var playerView = new player.PlayerView(playerModel, playerController);
});
