'use strict';

tileTypes.run(['tileState', 'gettext', function(tileState, gettext){
    tileState.addTemplate({
        deprecated: false,
        type: "default",
        size: "",
        colour: "purple",
        icon: "file-text-o",
        name: gettext("Content tile"),
        description: gettext("Supply content"),
        image_url: path_root + 'assets/resources/tile-default.jpg',
        template: {
            size: "normal",
            colour: "purple",
            name: gettext("New Content"),
            icon: "file-text-o",
            position: 0,
            image_url: "",
            settings: {
                html: '',
                title: ''
            },
            type: "default"
        }
        
    }
    );
}])
.controller('defaultTileController', ['tileState', 'callApi', 'trust', '$scope', '$rootScope', 'sharedTexts',
    function (tileState, callApi, trust, $scope, $rootScope, sharedTexts) {
    //make sure the inserted tile is not a template
    if (!$scope.tilereadonly && callApi.state.tiles[$scope.tileindex].template){
        callApi.state.tiles[$scope.tileindex] = callApi.state.tiles[$scope.tileindex].template;
        $scope.tile = callApi.state.tiles[$scope.tileindex]; 
    }
    
    
    this.safeHtml = function (html){
        return trust.html(html);
    };
    
    this.tileEdit = function ($event) {
        tileState.tileEdit($event, $scope.tile, $scope.tileindex);
    };
    
    this.tileDelete = function (m){
        m = m ? sharedTexts.getString(m) : '';
        tileState.tileDelete(m, $scope.tileindex);        
    };
    
    this.moveTile = function(new_screen_id){
        deblog('huidige screen is ', this.subscreen, callApi.state.screen.id);
        var current_screen = callApi.state.screen.id;
        var current_tile = callApi.state.stack.screens[current_screen -1].tiles.splice($scope.tileindex, 1);
        deblog('Hij heeft wat weggegooid', current_tile);
        callApi.state.stack.screens[new_screen_id -1].push(current_tile);
        //alert('nu moet ie nog naar de nieuwe');
        tileState.setTile();
        callApi.getTiles($scope.tile.settings.target);
    };
    
    this.tileClick = function ($event) {
       if (!$scope.tiletemplate){
            $(window).scrollTop(0);
            tileState.toggleSelect($event, 'off');
            tileState.setTile($scope.tile, "full", $scope.tileindex);
       }
    };
    
    $rootScope.$on('LTBApp.stack: close active tile', function(){
        if ($scope.tile.tile_id === tileState.tileEdit_id) tileState.tileEdit();
    });
    
    this.tileTemplateUrl = function(){
      return tileState.getTileUrl('default');
    };
}])

.controller('defaultFullController', ['tileState', 'trust', '$rootScope', 
    function(tileState, trust, $rootScope){
    var _this = this;
    this.edit_stack = tileState.edit_stack;        
    this.tile = tileState.selectedTile;
    
    this.init = function() {
        if (!this.tile.settings.html){
            this.tile.settings.html = '';
        }
        this.tile.settings.htmlSafe = trust.html(this.tile.settings.html);
    };

    this.init();

    $rootScope.$on('tilestate:setTileOnReload', function (){
        _this.tile = tileState.selectedTile;
        _this.init();
    });    
    
    this.tileClose = function ($event) {
       tileState.setTile();
    };
}])

.controller('defaultMenuController', ['callApi', 'tileState', 'sharedTexts', 'trust', '$rootScope',
    function(callApi, tileState, sharedTexts, trust, $rootScope){
    var _this = this;
    this.html = angular.copy(tileState.selectedTile.settings.html);
    this.title = tileState.selectedTile.settings.title;
    
    $rootScope.$on('tilestate:setTile', function (){
        _this.title = tileState.selectedTile;
    });

    this.tileDelete = function (m){
        m = m ? sharedTexts.getString(m) : '';
        tileState.tileDelete(m);        
    };
    
    this.saveHtml = function(){
        tileState.selectedTile.settings.html = this.html;
        tileState.selectedTile.settings.htmlSafe = trust.html(this.html);
		delete tileState.selectedTile.settings.htmlPreview;
        tileState.alerts.add(tileState.gettextCatalog.getString('Updated the content tile. Note that the stack has not been saved yet.'),'success');
    };
    
	this.showPreview = function(){
		tileState.setTile(tileState.selectedTile, "full");
		tileState.selectedTile.settings.htmlPreview = trust.html(this.html);
	};
		
	
    this.resetHtml = function(){
        this.html = angular.copy(tileState.selectedTile.settings.html);
		delete tileState.selectedTile.settings.htmlPreview;
    };
}]);
